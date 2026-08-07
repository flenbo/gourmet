/* ============================================================
   GOURMET GATHERINGS — Google Sheets Backend (Apps Script)
   Web App receiving client submissions & serving the console.
   Sheets:
     1. Event Submissions
     2. Discussion Tracker
     3. Analytics Dashboard
     4. Costing Settings   (shared rate master — keeps every machine in step)
     5. Quote Log          (one row per quote generated)
   Primary reference: 5-digit File Number.
   ------------------------------------------------------------
   SETUP:
   1. Create a Google Sheet → Extensions → Apps Script → paste this.
   2. Set TOKEN below (also set in js/store.js SHEETS_TOKEN, or
      localStorage 'zov_token').
   3. Deploy → New deployment → Web app → Execute as: Me,
      Who has access: Anyone. Copy the /exec URL.
   4. Put that URL in js/store.js SHEETS_ENDPOINT (or localStorage
      'zov_endpoint').
   ============================================================ */

var TOKEN = 'ZOVRYN-SECRET-2026';   // MUST match store.js SHEETS_TOKEN

var SHEET_MAIN  = 'Event Submissions';
var SHEET_DISC  = 'Discussion Tracker';
var SHEET_STATS = 'Analytics Dashboard';
var SHEET_COST  = 'Costing Settings';     // rate master + drivers, shared across machines
var SHEET_QUOTE = 'Quote Log';            // every quote generated, for history

var HEADERS = ['File Number','Client Name','Mobile','Event Date','Event Slot','Event Time',
  'Event Type','Occasion','PAX','Dietary','Location','Venue','Services','Add-ons',
  'Menu Selection','Custom Menu','Notes','Discussion Preference','Status',
  'Last Modified By','Last Updated On','Created On','_json'];

function getSheet_(name, headers){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); }
  if(headers && sh.getLastRow() === 0){
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#141109').setFontColor('#C8A060');
    sh.setFrozenRows(1);
  }
  return sh;
}

function menuString_(menu){
  menu = menu || {};
  return Object.keys(menu).map(function(c){ return c + ': ' + (menu[c]||[]).join(', '); }).join(' | ');
}

function rowFromRecord_(r){
  return [
    r.fileNumber||'', r.clientName||'', r.mobile||'', r.eventDate||'', r.eventSlot||'', r.eventTime||'',
    r.eventType||'', r.occasion||'', r.pax||'', r.dietary||'', r.location||'', r.venue||'',
    (r.services||[]).join(', '), (r.addons||[]).join(', '),
    menuString_(r.menu), r.customMenu||'', r.notes||'',
    (r.discDate||'')+' '+(r.discTime||'')+(r.discAltDate?(' / alt '+r.discAltDate+' '+(r.discAltTime||'')):''),
    r.status||'New Lead', r.lastModifiedBy||'Client', r.lastUpdatedOn||new Date().toISOString(), r.createdAt||new Date().toISOString(),
    JSON.stringify(r)
  ];
}

function findRow_(sh, fileNumber){
  var last = sh.getLastRow();
  if(last < 2) return -1;                 // header-only sheet → no data rows
  var ids = sh.getRange(2,1,last-1,1).getValues();
  for(var i=0;i<ids.length;i++){ if(String(ids[i][0])===String(fileNumber)) return i+2; }
  return -1;
}

function doPost(e){
  try{
    var body = JSON.parse(e.postData.contents);
    if(body.token !== TOKEN) return json_({ok:false,error:'unauthorized'});
    var main = getSheet_(SHEET_MAIN, HEADERS);

    if(body.action === 'submit'){
      var r = body.data;
      main.appendRow(rowFromRecord_(r));
      syncDiscussion_(r); rebuildStats_();
      return json_({ok:true, fileNumber:r.fileNumber});
    }
    if(body.action === 'update'){
      var fileNumber = body.data.fileNumber, patch = body.data.patch || {}, modifiedBy = body.data.modifiedBy || 'Admin';
      var row = findRow_(main, fileNumber);
      if(row<0) return json_({ok:false,error:'not-found'});
      var rec = JSON.parse(main.getRange(row, HEADERS.length, 1, 1).getValue() || '{}');
      Object.keys(patch).forEach(function(k){
        if(k==='internalNotes'){ rec.internalNotes = Object.assign({}, rec.internalNotes||{}, patch.internalNotes); }
        else rec[k]=patch[k];
      });
      rec.lastModifiedBy = modifiedBy;
      rec.lastUpdatedOn = new Date().toISOString();
      main.getRange(row,1,1,HEADERS.length).setValues([rowFromRecord_(rec)]);
      syncDiscussion_(rec); rebuildStats_();
      return json_({ok:true});
    }
    // ---- costing settings: one row, JSON blob, shared by every machine ----
    if(body.action === 'saveCosting'){
      var sh = getSheet_(SHEET_COST, ['Updated On','Updated By','_json']);
      var payload = JSON.stringify(body.data.settings || {});
      var when = new Date().toISOString();
      var who  = body.data.updatedBy || 'Admin';
      if(sh.getLastRow() < 2) sh.appendRow([when, who, payload]);
      else sh.getRange(2,1,1,3).setValues([[when, who, payload]]);
      return json_({ok:true, updatedOn:when});
    }

    // ---- append a generated quote to the log ----
    if(body.action === 'logQuote'){
      var q = body.data || {};
      var qs = getSheet_(SHEET_QUOTE, ['Generated On','File Number','Client','Event Date','Event Type',
        'PAX','Dishes','COGS/Guest','List/Guest','Discount %','Net/Guest','Net Total','GST',
        'Grand Total','Margin %','By']);
      qs.appendRow([new Date().toISOString(), q.fileNumber||'', q.clientName||'', q.eventDate||'',
        q.eventType||'', q.pax||'', q.dishes||'', q.cogsPP||'', q.listPP||'', q.discountPct||'',
        q.netPP||'', q.net||'', q.gst||'', q.grand||'', q.marginPct||'', q.by||'Admin']);
      return json_({ok:true});
    }

    return json_({ok:false,error:'unknown-action'});
  }catch(err){ return json_({ok:false,error:String(err)}); }
}

function doGet(e){
  var params = e.parameter || {};
  if(params.token !== TOKEN) return json_({ok:false,error:'unauthorized'});
  if(params.action === 'list'){
    var sh = getSheet_(SHEET_MAIN, HEADERS);
    var last = sh.getLastRow();
    if(last<2) return json_({ok:true, events:[]});
    var jsonCol = sh.getRange(2, HEADERS.length, last-1, 1).getValues();
    var events = jsonCol.map(function(row){ try{ return JSON.parse(row[0]); }catch(e){ return null; } }).filter(Boolean);
    return json_({ok:true, events:events});
  }
  if(params.action === 'getCosting'){
    var sh = getSheet_(SHEET_COST, ['Updated On','Updated By','_json']);
    if(sh.getLastRow() < 2) return json_({ok:true, settings:null});
    var row = sh.getRange(2,1,1,3).getValues()[0];
    var parsed = null;
    try{ parsed = JSON.parse(row[2] || 'null'); }catch(e){ parsed = null; }
    return json_({ok:true, settings:parsed, updatedOn:row[0], updatedBy:row[1]});
  }
  return json_({ok:true, msg:'Gourmet Gatherings backend is running.'});
}

function syncDiscussion_(r){
  var sh = getSheet_(SHEET_DISC, ['File Number','Client','Discussion Date','Discussion Notes','Follow-up Actions','Proposal Status','Last Modified By','Last Updated On']);
  var n = r.internalNotes||{};
  var rowVals = [ r.fileNumber, r.clientName, (r.discDate||'')+' '+(r.discTime||''), n.discussion||'', n.followup||'',
    n.proposal ? 'Notes added' : (r.status==='Proposal Shared' ? 'Shared' : 'Pending'), r.lastModifiedBy||'Client', r.lastUpdatedOn||'' ];
  var row = findRow_(sh, r.fileNumber);
  if(row<0) sh.appendRow(rowVals); else sh.getRange(row,1,1,rowVals.length).setValues([rowVals]);
}

function rebuildStats_(){
  var main = getSheet_(SHEET_MAIN, HEADERS);
  var last = main.getLastRow();
  var events = [];
  if(last>=2){
    var col = main.getRange(2, HEADERS.length, last-1, 1).getValues();
    events = col.map(function(r){ try{return JSON.parse(r[0]);}catch(e){return null;} }).filter(Boolean);
  }
  var total = events.length;
  var confirmed = events.filter(function(e){return e.status==='Confirmed';}).length;
  var today = new Date(); today.setHours(0,0,0,0);
  var upcoming = events.filter(function(e){return e.eventDate && new Date(e.eventDate)>=today && e.status!=='Closed';}).length;
  var proj = events.filter(function(e){return ['Proposal Shared','Negotiation','Confirmed'].indexOf(e.status)>-1;}).reduce(function(s,e){return s + (parseInt(e.pax||0,10)*1550);},0);
  var sh = getSheet_(SHEET_STATS, ['Metric','Value','Updated']);
  var now = new Date().toISOString();
  var rows = [['Total Leads', total, now],['Conversion %', total?Math.round(confirmed/total*100)+'%':'0%', now],['Upcoming Events', upcoming, now],['Revenue Projection (Rs.)', proj, now]];
  sh.getRange(2,1,rows.length,3).setValues(rows);
}

function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
