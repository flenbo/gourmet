/* ============================================================
   Gourmet Gatherings — Costing console UI
   Adds three pages to the operations console:
     #page-costing   cost build-up, margin, grossed-up discount
     #page-ration    vendor-grouped raw material order list
     #page-rates     editable rate master & cost drivers
   Reads events through GG_STORE. Costing maths lives in costing.js.
   ============================================================ */
(function(){
'use strict';
var C = window.GG_COST, S = window.GG_STORE;
if(!C) return;

function $(s,r){ return (r||document).querySelector(s); }
function $$(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
var M = C.money, M2 = C.money2;
function N(n,d){ return (+n||0).toLocaleString('en-IN',{minimumFractionDigits:d===undefined?2:d,maximumFractionDigits:d===undefined?2:d}); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function toast(m,k){ var t=$('#toast'); if(!t) return; t.textContent=m; t.className='toast show '+(k||''); clearTimeout(t._t); t._t=setTimeout(function(){t.className='toast';},2400); }

var EVENTS = [], CUR = null;
var OPT = { transport:0, season:null, gm:null, negotiation:null, discount:null, labour:null, cans:true, overage:null };

/* ---------- styles ---------- */
var CSS = document.createElement('style');
CSS.textContent = [
'.cost-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}',
'@media(max-width:1000px){.cost-grid{grid-template-columns:1fr}}',
'.cbox{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:16px 18px;margin-bottom:16px}',
'.cbox h3{margin:0 0 12px;font-size:.95rem;letter-spacing:.04em;text-transform:uppercase;color:var(--gold)}',
'.cfield{display:grid;grid-template-columns:150px 1fr;gap:10px;align-items:center;margin-bottom:8px}',
'.cfield label{font-size:.85rem;color:#666}',
'.cfield input,.cfield select{width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:#fafafa;font:inherit}',
'@media(max-width:560px){.cfield{grid-template-columns:1fr;gap:3px}}',
'.ctiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px}',
'.ctile{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:12px 14px}',
'.ctile .k{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:#8a8a8a;font-weight:700;margin-bottom:4px}',
'.ctile .v{font-size:1.5rem;font-weight:700;line-height:1.1}',
'.ctile .s{font-size:.72rem;color:#8a8a8a;margin-top:3px}',
'.ctile.hero{background:linear-gradient(135deg,#1b1b1b,#3a3a3a);border-color:transparent}',
'.ctile.hero .k,.ctile.hero .s{color:rgba(255,255,255,.75)}.ctile.hero .v{color:#fff}',
'.ctbl{width:100%;border-collapse:collapse;font-size:.82rem}',
'.ctbl th{text-align:left;font-size:.66rem;text-transform:uppercase;letter-spacing:.05em;color:#8a8a8a;padding:6px 7px;border-bottom:1px solid var(--line)}',
'.ctbl td{padding:6px 7px;border-bottom:1px solid #f0f0f0}',
'.ctbl tr:last-child td{border-bottom:0}',
'.num{text-align:right;font-variant-numeric:tabular-nums}',
'.mtrack{position:relative;height:26px;border-radius:8px;background:#f0f0f0;overflow:hidden;border:1px solid var(--line)}',
'.mband{position:absolute;top:0;bottom:0;background:rgba(12,163,12,.16);border-left:1px solid rgba(12,163,12,.5);border-right:1px solid rgba(12,163,12,.5)}',
'.mfill{position:absolute;top:0;bottom:0;left:0;opacity:.3}',
'.mneedle{position:absolute;top:-3px;bottom:-3px;width:3px;background:#111;border-radius:2px;box-shadow:0 0 0 2px #fff}',
'.mscale{display:flex;justify-content:space-between;font-size:.66rem;color:#8a8a8a;margin-top:4px}',
'.cverdict{display:flex;gap:8px;align-items:center;margin-top:11px;padding:9px 12px;border-radius:8px;font-size:.82rem;font-weight:600}',
'.vg{background:rgba(12,163,12,.1);color:#0a7a0a}.vw{background:rgba(250,178,25,.14);color:#8a5c00}.vc{background:rgba(208,59,59,.1);color:#b32d2d}',
'.stackbar{display:flex;height:22px;border-radius:6px;overflow:hidden;background:#f0f0f0;margin-bottom:9px}',
'.stackbar>div{border-right:2px solid #fff}.stackbar>div:last-child{border-right:0}',
'.lgnd{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px 14px;font-size:.78rem}',
'.lgnd i{width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:6px}',
'.vhdr{display:flex;align-items:baseline;gap:9px;margin:16px 0 5px;padding-bottom:5px;border-bottom:2px solid var(--gold)}',
'.vhdr h4{margin:0;font-size:.85rem;letter-spacing:.03em}.vhdr .t{margin-left:auto;font-weight:700;font-variant-numeric:tabular-nums}',
'.pill{display:inline-block;font-size:.64rem;padding:1px 7px;border-radius:99px;background:#f2f2f2;border:1px solid var(--line);color:#666;white-space:nowrap}',
'.pill.a{border-color:#e0a800;color:#8a5c00}.pill.n{border-color:#d03b3b;color:#b32d2d}',
'.cbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}',
'.cnote{font-size:.74rem;color:#8a8a8a;line-height:1.6;margin-top:9px}',
'.rateRow input{width:100%;padding:4px 7px;border:1px solid var(--line);border-radius:6px;background:#fafafa;font:inherit;font-size:.8rem}',
'@media print{.admin-nav,.admin-top,.sync-banner,.cbar,.no-print{display:none!important}}'
].join('');
document.head.appendChild(CSS);

/* ---------- page shells ---------- */
function injectPages(){
  var nav = $('.admin-nav'); if(!nav || $('#page-costing')) return;
  [['costing','Costing'],['ration','Ration'],['rates','Rates']].forEach(function(p){
    var b=document.createElement('button'); b.dataset.page=p[0]; b.textContent=p[1]; nav.appendChild(b);
  });
  var shell = $('#console');
  ['costing','ration','rates'].forEach(function(id){
    var d=document.createElement('div'); d.className='admin-page'; d.id='page-'+id; shell.appendChild(d);
  });

  $('#page-costing').innerHTML =
    '<h2 style="margin-bottom:4px">Costing &amp; Quote</h2>'+
    '<p class="small muted" style="margin-bottom:16px">Menu comes straight from the event. Add labour, transport and season to get your price.</p>'+
    '<div class="cbar">'+
      '<select id="cEvent" style="flex:1;min-width:250px;padding:8px 10px;border:1px solid var(--line);border-radius:8px"></select>'+
      '<button class="btn sm btn-ghost" id="cQuoteBtn">\u2193 PDF Quote</button>'+
      '<button class="btn sm" id="cWaBtn" style="background:#1f7a45;color:#fff;border-color:transparent">WhatsApp Quote</button>'+
      '<button class="btn sm btn-gold" id="cSaveBtn">Save to event</button>'+
    '</div>'+
    '<div id="cBody"></div>';

  $('#page-ration').innerHTML =
    '<h2 style="margin-bottom:4px">Ration order list</h2>'+
    '<p class="small muted" style="margin-bottom:14px">Raw material for the event selected on the Costing page.</p>'+
    '<div class="cbar">'+
      '<label style="font-size:.82rem"><input type="checkbox" id="rBuf" checked> Wastage buffer</label>'+
      '<label style="font-size:.82rem"><input type="checkbox" id="rPack" checked> Round to purchase packs</label>'+
      '<button class="btn sm btn-ghost" id="rCsv">⬇ Export CSV</button>'+
      '<span class="pill" id="rSum"></span>'+
    '</div><div id="rBody"></div>';

  $('#page-rates').innerHTML =
    '<h2 style="margin-bottom:4px">Rates &amp; cost drivers</h2>'+
    '<p class="small muted" style="margin-bottom:14px">Edit a rate and every quote re-prices. Saved on this device.</p>'+
    '<div class="cbar">'+
      '<input id="rateSearch" placeholder="Search raw material…" style="flex:1;min-width:200px;padding:8px 10px;border:1px solid var(--line);border-radius:8px">'+
      '<select id="rateVendor" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px"></select>'+
      '<button class="btn sm btn-ghost" id="rateExport">⬇ Backup</button>'+
      '<label class="btn sm btn-ghost" style="cursor:pointer">⬆ Restore<input type="file" id="rateImport" accept=".json" hidden></label>'+
      '<button class="btn sm btn-ghost" id="rateReset">Reset to defaults</button>'+
    '</div><div id="ratesBody"></div>';

  // hook the console's own nav switching
  $$('.admin-nav button').forEach(function(b){
    b.addEventListener('click', function(){
      $$('.admin-nav button').forEach(function(x){x.classList.remove('active');});
      b.classList.add('active');
      $$('.admin-page').forEach(function(p){p.classList.remove('active');});
      var el=$('#page-'+b.dataset.page); if(el) el.classList.add('active');
      if(b.dataset.page==='rates') renderRates();
      if(b.dataset.page==='ration') renderRation();
    });
  });
}

/* ---------- event picker ---------- */
function loadEvents(){
  if(!S) return Promise.resolve([]);
  return S.all().then(function(list){
    EVENTS = (list||[]).slice().sort(function(a,b){
      return String(b.eventDate||'').localeCompare(String(a.eventDate||''));
    });
    var sel = $('#cEvent'); if(!sel) return EVENTS;
    sel.innerHTML = EVENTS.length
      ? EVENTS.map(function(e,i){
          return '<option value="'+i+'">'+esc(e.eventDate||'no date')+' · '+esc(e.clientName||'—')+
                 ' · '+esc(e.pax||0)+' pax · '+esc(e.status||'')+' · File '+esc(e.fileNumber)+'</option>';
        }).join('')
      : '<option value="">No events yet</option>';
    if(EVENTS.length){ pick(0); }
    return EVENTS;
  });
}
function pick(i){
  CUR = EVENTS[i] || null;
  if(!CUR) return;
  var saved = (CUR.costing||{});
  OPT.transport   = saved.transport!==undefined ? saved.transport : 0;
  OPT.season      = saved.season || C.settings().water.default;
  OPT.gm          = saved.gm!==undefined ? saved.gm : C.settings().drivers.gmTarget;
  OPT.negotiation = saved.negotiation!==undefined ? saved.negotiation : C.settings().drivers.negotiation;
  OPT.discount    = saved.discount!==undefined ? saved.discount : C.settings().drivers.showDiscount;
  if(saved.labour){ OPT.labour = saved.labour.slice(); }
  else {
    var px = Math.max(1, +CUR.pax || 1);
    OPT.labour = C.settings().labour.map(function(l){
      var n = l.count;
      if(/steward/i.test(l.role)) n = Math.max(2, Math.ceil(px/25));
      else if(/clean/i.test(l.role)) n = Math.max(1, Math.ceil(px/60));
      return {role:l.role, rate:l.rate, count:n};
    });
  }
  render();
}

/* ---------- main render ---------- */
function render(){
  if(!CUR){ $('#cBody').innerHTML='<p class="small muted">Create or select an event first.</p>'; return; }
  var st = C.settings(), dr = st.drivers;
  var cost = C.costEvent(CUR, {transport:OPT.transport, season:OPT.season, labour:OPT.labour});
  var p = C.priceEvent(CUR, {cost:cost, gm:OPT.gm, negotiation:OPT.negotiation, discount:OPT.discount});
  window._ggLast = {cost:cost, price:p};

  var approx = cost.lines.filter(function(l){ return l.kind==='approx'||l.kind==='none'; });
  var tot = cost.heads.reduce(function(a,b){return a+b.v;},0)||1;
  var gmp = p.marginPct, pos=function(x){ return Math.max(0,Math.min(100,(x-50)/30*100)); };
  var vk = gmp<dr.gmlo?['vc','▼','Below your '+dr.gmlo+'% floor — trim the discount or raise the list price']
         : gmp>dr.gmhi?['vw','▲','Above your '+dr.gmhi+'% ceiling — you have room to concede']
         : ['vg','●','On target — '+N(gmp,1)+'% sits inside your '+dr.gmlo+'–'+dr.gmhi+'% band'];

  $('#cBody').innerHTML =
   '<div class="ctiles">'+
    '<div class="ctile hero"><div class="k">Quote to client</div><div class="v">'+M(p.netPP)+'</div><div class="s">per guest · '+M(p.net)+' total</div></div>'+
    '<div class="ctile"><div class="k">Cost per guest</div><div class="v">'+M(cost.cogsPP)+'</div><div class="s">'+M2(cost.foodPP)+' food · '+Math.round(cost.plates)+' plates</div></div>'+
    '<div class="ctile"><div class="k">Gross margin</div><div class="v">'+N(gmp,1)+'%</div><div class="s">'+M(p.marginAmt)+' gross profit</div></div>'+
    '<div class="ctile"><div class="k">Grand total</div><div class="v">'+M(p.grand)+'</div><div class="s">incl. '+M(p.gst)+' GST</div></div>'+
   '</div>'+
   '<div class="cost-grid"><div>'+
     '<div class="cbox"><h3>Event inputs</h3>'+
       '<div class="cfield"><label>Minimum guarantee</label><input id="iPax" type="number" value="'+cost.pax+'" disabled title="Set on the event record"></div>'+
       '<div class="cfield"><label>Transport (actuals)</label><input id="iTrans" type="number" min="0" step="100" value="'+OPT.transport+'"></div>'+
       '<div class="cfield"><label>Season (water)</label><select id="iSeason">'+
         Object.keys(st.water.seasons).map(function(k){ return '<option'+(k===OPT.season?' selected':'')+'>'+esc(k)+'</option>'; }).join('')+
       '</select></div>'+
       '<div class="cnote">Water: '+st.water.seasons[OPT.season]+' bottles a head, bought in crates of '+st.water.crateSize+' at '+M(st.water.cratePrice)+'.</div>'+
     '</div>'+
     '<div class="cbox"><h3>Labour — you set the counts</h3>'+
       OPT.labour.map(function(l,i){
         return '<div class="cfield"><label>'+esc(l.role)+'</label><div style="display:flex;gap:6px">'+
           '<input type="number" min="0" data-lab="'+i+'" value="'+l.count+'" style="flex:1">'+
           '<span style="align-self:center;color:#999;font-size:.8rem">× ₹</span>'+
           '<input type="number" min="0" step="50" data-labr="'+i+'" value="'+l.rate+'" style="flex:1"></div></div>';
       }).join('')+
       '<div class="cnote">Chef defaults to zero. Add a count if chefs are a cash cost, or margin reads higher than it is.</div>'+
     '</div>'+
     '<div class="cbox"><h3>Menu picked up from the event <span class="pill">'+cost.lines.length+' dishes</span></h3>'+
       '<table class="ctbl"><thead><tr><th>Dish</th><th>Course</th><th class="num">Cost / guest</th></tr></thead><tbody>'+
       cost.lines.map(function(l){
         var flag = l.kind==='alias' ? '<span class="pill" title="Costed as '+esc(l.matched)+'">≈</span>'
                  : l.kind==='approx'? '<span class="pill a" title="Approximate match: '+esc(l.matched)+'">approx</span>'
                  : l.kind==='none'  ? '<span class="pill n" title="No recipe — category average used">est</span>' : '';
         return '<tr><td>'+esc(l.name)+' '+flag+'</td><td style="color:#888">'+esc(l.cat)+'</td><td class="num">'+M2(l.cost)+'</td></tr>';
       }).join('')+
       '</tbody><tfoot><tr><td colspan="2" style="font-weight:700">Food cost per guest</td><td class="num" style="font-weight:700">'+M2(cost.foodPP)+'</td></tr></tfoot></table>'+
       (approx.length?'<div class="cnote">'+approx.length+' dish(es) had no exact recipe and were costed by closest match or course average. Rename them on the event to match the menu card for exact costing.</div>':'')+
     '</div>'+
   '</div><div>'+
     '<div class="cbox"><h3>Price, discount &amp; negotiation room</h3>'+
       '<div class="cfield"><label>Target gross margin</label><input id="iGm" type="number" min="40" max="85" step="0.5" value="'+OPT.gm+'"></div>'+
       '<div class="cfield"><label>Negotiation cushion %</label><input id="iNego" type="number" min="0" max="40" step="0.5" value="'+OPT.negotiation+'"></div>'+
       '<div class="cfield"><label>Discount shown %</label><input id="iDisc" type="number" min="0" max="60" step="0.5" value="'+OPT.discount+'"></div>'+
       '<table class="ctbl" style="margin-top:10px"><tbody>'+
         '<tr><td>List price (before discount)</td><td class="num">'+M(p.listPP)+' / guest</td><td class="num">'+M(p.list)+'</td></tr>'+
         '<tr><td>Less '+N(p.discountPct,1)+'% discount</td><td class="num" style="color:#b32d2d">−'+M(p.discountAmt/cost.pax)+'</td><td class="num" style="color:#b32d2d">−'+M(p.discountAmt)+'</td></tr>'+
         '<tr><td style="font-weight:700">Net quote</td><td class="num" style="font-weight:700">'+M(p.netPP)+'</td><td class="num" style="font-weight:700">'+M(p.net)+'</td></tr>'+
         '<tr><td>GST @ '+dr.gst+'%</td><td class="num"></td><td class="num">'+M(p.gst)+'</td></tr>'+
         '<tr><td style="font-weight:700">Payable</td><td class="num"></td><td class="num" style="font-weight:700">'+M(p.grand)+'</td></tr>'+
       '</tbody></table>'+
       '<div class="mtrack" style="margin-top:14px">'+
         '<div class="mband" style="left:'+pos(dr.gmlo)+'%;width:'+(pos(dr.gmhi)-pos(dr.gmlo))+'%"></div>'+
         '<div class="mfill" style="width:'+pos(gmp)+'%;background:'+(gmp<dr.gmlo?'#d03b3b':gmp>dr.gmhi?'#fab219':'#0ca30c')+'"></div>'+
         '<div class="mneedle" style="left:calc('+pos(gmp)+'% - 1.5px)"></div></div>'+
       '<div class="mscale"><span>50%</span><span>60%</span><span>65%</span><span>70%</span><span>80%</span></div>'+
       '<div class="cverdict '+vk[0]+'"><span>'+vk[1]+'</span><span>'+vk[2]+'</span></div>'+
       '<div class="cnote"><b>Your floor is '+M(p.floorPP)+' a guest</b> ('+M(p.floor)+' total) — that is '+N(p.marginAtFloorPct,1)+'% margin. '+
         'You can still concede <b>'+M(p.roomPP)+' a guest</b> ('+M(p.room)+') during negotiation and stay on target. '+
         'The '+N(p.discountPct,1)+'% discount the client sees is already built into the list price, so it costs you nothing.</div>'+
       (p.belowMin?'<div class="cverdict vw" style="margin-top:8px"><span>▲</span><span>Below the '+M(dr.minorder)+' minimum food order value.</span></div>':'')+
     '</div>'+
     '<div class="cbox"><h3>Where the cost goes</h3>'+
       '<div class="stackbar">'+cost.heads.map(function(h){ return '<div style="width:'+(h.v/tot*100)+'%;background:'+h.c+'" title="'+esc(h.k)+': '+M(h.v)+'"></div>'; }).join('')+'</div>'+
       '<div class="lgnd">'+cost.heads.map(function(h){ return '<div><i style="background:'+h.c+'"></i>'+esc(h.k)+' <b style="float:right">'+N(h.v/tot*100,0)+'%</b></div>'; }).join('')+'</div>'+
       '<table class="ctbl" style="margin-top:12px"><tbody>'+
         cost.heads.map(function(h){ return '<tr><td>'+esc(h.k)+'</td><td class="num">'+M2(h.v/cost.pax)+'</td><td class="num">'+M(h.v)+'</td></tr>'; }).join('')+
         '<tr><td style="font-weight:700">Total COGS</td><td class="num" style="font-weight:700">'+M2(cost.cogsPP)+'</td><td class="num" style="font-weight:700">'+M(cost.cogs)+'</td></tr>'+
       '</tbody></table></div>'+
     '<div class="cbox"><h3>Water, cans &amp; labour</h3><table class="ctbl"><tbody>'+
       cost.labour.map(function(l){ return '<tr><td>'+esc(l.role)+'</td><td class="num">'+l.count+' × '+M(l.rate)+'</td><td class="num">'+M(l.cost)+'</td></tr>'; }).join('')+
       cost.bev.map(function(b){ return '<tr><td>'+esc(b.item)+'</td><td class="num">'+b.packs+' × '+b.pack+' '+b.packu+'</td><td class="num">'+M(b.cost)+'</td></tr>'; }).join('')+
     '</tbody></table></div>'+
   '</div></div>';

  $('#iTrans').oninput = function(){ OPT.transport=+this.value||0; render(); };
  $('#iSeason').onchange = function(){ OPT.season=this.value; render(); };
  ['iGm','iNego','iDisc'].forEach(function(id,k){
    var el=$('#'+id); if(!el) return;
    el.oninput = function(){ OPT[['gm','negotiation','discount'][k]] = +this.value||0; render(); };
  });
  $$('[data-lab]').forEach(function(el){ el.oninput=function(){ OPT.labour[+el.dataset.lab].count=+el.value||0; render(); }; });
  $$('[data-labr]').forEach(function(el){ el.oninput=function(){ OPT.labour[+el.dataset.labr].rate=+el.value||0; render(); }; });
  renderRation();
}

/* ---------- ration ---------- */
function renderRation(){
  var body=$('#rBody'); if(!body) return;
  if(!CUR){ body.innerHTML='<p class="small muted">Select an event on the Costing page.</p>'; return; }
  var cost = C.costEvent(CUR, {transport:OPT.transport, season:OPT.season, labour:OPT.labour});
  var r = C.ration(CUR, {cost:cost, buffer:$('#rBuf')?$('#rBuf').checked:true, round:$('#rPack')?$('#rPack').checked:true});
  window._ggRation = r;
  $('#rSum').textContent = M(r.buy)+' to buy fresh · '+M(r.consume)+' consumed · '+r.reorders+' pantry re-orders';
  body.innerHTML = r.vendors.map(function(v){
    var rows=r.byVendor[v], fresh=rows[0].mode==='FRESH';
    var t=rows.reduce(function(a,b){return a+b.val;},0);
    return '<div class="vhdr"><h4>'+esc(v)+'</h4><span class="pill">'+(fresh?'buy for this event':'from pantry stock')+'</span>'+
      '<span class="pill">'+rows.length+' lines</span><span class="t">'+M(t)+'</span></div>'+
      '<table class="ctbl"><thead><tr><th>Raw material</th><th class="num">Needs</th><th class="num">'+(fresh?'Order':'Draw')+'</th>'+
      '<th>'+(fresh?'Packs':'Action')+'</th><th class="num">Rate</th><th class="num">Value</th></tr></thead><tbody>'+
      rows.map(function(x){
        var q=function(v,u){ return u==='pc'?N(v,0)+' pc':(v<1?N(v*1000,0)+(u==='L'?' ml':' g'):N(v,2)+' '+u); };
        var act = fresh ? (x.packs!==null? x.packs+' × '+x.pack+' '+x.packu : '—')
                        : (x.reorder? '<b style="color:#c2571f">▲ re-order</b>' : '<span style="color:#aaa">in stock</span>');
        return '<tr><td>'+esc(x.name)+'</td><td class="num">'+q(x.need,x.unit)+'</td><td class="num"><b>'+q(x.order,x.unit)+'</b></td>'+
               '<td>'+act+'</td><td class="num">'+M2(x.rate)+'</td><td class="num">'+M(x.val)+'</td></tr>';
      }).join('')+'</tbody></table>';
  }).join('');
}

/* ---------- rate master ---------- */
function renderRates(){
  var body=$('#ratesBody'); if(!body) return;
  var st=C.settings();
  var vendors=[]; Object.keys(st.rates).forEach(function(n){ if(vendors.indexOf(st.rates[n].vendor)<0) vendors.push(st.rates[n].vendor); });
  var vsel=$('#rateVendor');
  if(vsel && !vsel.dataset.done){ vsel.innerHTML='<option value="">All vendors</option>'+vendors.sort().map(function(v){return '<option>'+esc(v)+'</option>';}).join(''); vsel.dataset.done='1'; }
  var q=($('#rateSearch').value||'').toLowerCase(), fv=vsel?vsel.value:'';
  var names=Object.keys(st.rates).filter(function(n){
    return (!q||n.toLowerCase().indexOf(q)>-1) && (!fv||st.rates[n].vendor===fv);
  }).sort();

  body.innerHTML =
    '<div class="cbox"><h3>Cost drivers</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px 18px">'+
    [['gmTarget','Target gross margin %'],['gmlo','Floor margin %'],['gmhi','Ceiling margin %'],
     ['negotiation','Negotiation cushion %'],['showDiscount','Default discount shown %'],
     ['overage','Extra plates over MG %'],['equip','Equipment / guest ₹'],['fuel','Gas & fuel / guest ₹'],
     ['packing','Packing / guest ₹'],['cont','Contingency %'],['gst','GST %'],['minorder','Minimum order ₹'],
     ['advancePct','Advance %'],['cardSurcharge','Card surcharge %']].map(function(d){
      return '<div class="cfield" style="grid-template-columns:1fr 90px"><label>'+d[1]+'</label>'+
             '<input type="number" step="0.5" data-drv="'+d[0]+'" value="'+st.drivers[d[0]]+'"></div>';
    }).join('')+'</div></div>'+
    '<div class="cbox"><h3>Bottled water</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px 18px">'+
      '<div class="cfield" style="grid-template-columns:1fr 90px"><label>Crate price ₹</label><input type="number" data-wat="cratePrice" value="'+st.water.cratePrice+'"></div>'+
      '<div class="cfield" style="grid-template-columns:1fr 90px"><label>Bottles per crate</label><input type="number" data-wat="crateSize" value="'+st.water.crateSize+'"></div>'+
      Object.keys(st.water.seasons).map(function(k){
        return '<div class="cfield" style="grid-template-columns:1fr 90px"><label>'+esc(k)+' — bottles/guest</label><input type="number" step="0.1" data-season="'+esc(k)+'" value="'+st.water.seasons[k]+'"></div>';
      }).join('')+'</div></div>'+
    '<div class="cbox"><h3>Rate master <span class="pill">'+names.length+' of '+Object.keys(st.rates).length+'</span></h3>'+
      '<div style="max-height:520px;overflow:auto"><table class="ctbl"><thead><tr><th>Raw material</th><th>Vendor</th>'+
      '<th class="num" style="width:110px">Rate ₹</th><th>Unit</th><th class="num">Pack</th><th class="num" style="width:80px">Buffer %</th><th>Mode</th><th>Conf</th></tr></thead><tbody>'+
      names.map(function(n){ var g=st.rates[n];
        return '<tr class="rateRow"><td>'+esc(n)+'</td><td style="color:#888">'+esc(g.vendor)+'</td>'+
          '<td><input type="number" step="0.01" data-rate="'+esc(n)+'" value="'+g.rate+'"></td>'+
          '<td style="color:#888">per '+esc(g.base)+'</td><td class="num">'+g.pack+' '+esc(g.packu)+'</td>'+
          '<td><input type="number" step="1" data-buf="'+esc(n)+'" value="'+g.buf+'"></td>'+
          '<td style="color:#888">'+esc(g.mode)+'</td><td style="color:'+(g.conf==='L'?'#b32d2d':g.conf==='H'?'#0a7a0a':'#888')+'">'+esc(g.conf)+'</td></tr>';
      }).join('')+'</tbody></table></div></div>';

  $$('[data-drv]').forEach(function(el){ el.onchange=function(){ st.drivers[el.dataset.drv]=+el.value||0; C.save(); toast('Saved','ok'); if(CUR) render(); }; });
  $$('[data-wat]').forEach(function(el){ el.onchange=function(){ st.water[el.dataset.wat]=+el.value||0; C.save(); toast('Saved','ok'); if(CUR) render(); }; });
  $$('[data-season]').forEach(function(el){ el.onchange=function(){ st.water.seasons[el.dataset.season]=+el.value||0; C.save(); toast('Saved','ok'); if(CUR) render(); }; });
  $$('[data-rate]').forEach(function(el){ el.onchange=function(){ st.rates[el.dataset.rate].rate=+el.value||0; C.save(); toast('Rate saved','ok'); if(CUR) render(); }; });
  $$('[data-buf]').forEach(function(el){ el.onchange=function(){ st.rates[el.dataset.buf].buf=+el.value||0; C.save(); toast('Saved','ok'); if(CUR) render(); }; });
}

/* ---------- branded PDF quote (matches js/pdf.js house style) ---------- */
var RED=[216,30,58], CHAR=[30,26,20], MUTED=[140,131,117], LINE=[224,214,198], CREAM=[255,253,248];

var QTERMS = [
  ['1. Pricing & Guest Count', null, [
    'Prices are per plate and inclusive of applicable taxes unless mentioned otherwise.',
    'Final guest count (MG - Minimum Guarantee) must be confirmed 48 hours prior to the event.',
    'We provision only 5%-7.5% extra plates over MG.',
    'Any consumption beyond MG will be charged additionally as per per-plate rate.']],
  ['2. Payment Terms', null, [
    '75% advance payment or as agreed by Flenbo Foodworks is mandatory for order confirmation.',
    'Balance 25% payment or due amount must be cleared immediately after the event on the same day (before team demobilization).',
    'Credit card payment would attract additional 3% charges on the invoice amount.',
    'Any delay in balance payment beyond 24 hours will attract follow-up and may impact future services.']],
  ['3. Service Timings', null, [
    'Beverage service - Only one option applicable: (With Starters / With Main Course / Post Main Course)',
    'Starter service duration: Maximum 60 minutes or as agreed by Flenbo Foodworks in writing.',
    'Main course service duration: Maximum 90 minutes after starters or as agreed by Flenbo Foodworks in writing.',
    'Starters and Main Course will not run simultaneously.',
    'There will be a 15-minute gap between closure of starter service and start of main course service.',
    'Any extension beyond agreed service time will be chargeable and communicated well in advance to the client.']],
  ['4. Cancellation & Refund Policy', 'Partial Refunds are applicable only in cases of:', [
    'Non-delivery due to our fault',
    'Completely wrong menu supplied',
    'Verified quality issues (with photo proof)',
    'Order is cancelled atleast 48 hours before the event.'],
    'No refunds will be given for:', [
    'Taste preferences or dislikes','Change of mind','Guest turnout being lower than MG',
    'Guest delays or no show due to traffic, weather, or venue restrictions',
    'No refunds for orders cancelled within 0-48 hours prior to the event.']],
  ['5. Food Allergens', null, [
    'Our food may contain or come in contact with allergens such as dairy, gluten, nuts, soy, and seeds.',
    'Clients must inform us in advance of any dietary restrictions or allergies.']],
  ['6. Client Responsibilities', 'Client must ensure:', [
    'To provide space at ODC site to setup cooking area and Tandoor (if required as per menu)',
    'Power & water availability (if required)',
    'Timely start of event as per schedule.',
    'Maintain Starters and Main Course timelines as communicated above in service timings.',
    'Delay caused due to venue readiness will not impact service duration or billing.']],
  ['7. Left Over Food Packing', null, [
    'Left over food would be packed in the proportion of shortfall of numbers to that of Minimum Guarantee. No left over food would be packed once the minimum guarantee numbers are achieved.']],
  ['8. Legal Jurisdiction', null, [
    'All disputes shall be subject to Gurugram, Haryana jurisdiction only.']]
];

function buildQuotePdf(){
  if(!window.jspdf) throw new Error('PDF library still loading - try again in a moment.');
  if(!CUR || !window._ggLast) throw new Error('Select an event first.');
  var st=C.settings(), co=st.company, dr=st.drivers;
  var cost=window._ggLast.cost, p=window._ggLast.price;
  var LOGO = window.GG_LOGO || null;
  var doc = new window.jspdf.jsPDF({unit:'pt', format:'a4'});
  var W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(), Mg=56, y=0;
  var INK=[26,24,22], BODY=[64,60,56];

  /* ---------- formatting ---------- */
  function ord(d){ return d+(d>3&&d<21?'th':{1:'st',2:'nd',3:'rd'}[d%10]||'th'); }
  var MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function letterDate(){ var d=new Date();
    return (MON[d.getMonth()]+' '+ord(d.getDate())+"' "+d.getFullYear()).toUpperCase(); }
  function eventDateLong(ds){ if(!ds) return 'your upcoming event';
    try{ var d=new Date(String(ds)+'T00:00:00');
      return ord(d.getDate())+' '+MON[d.getMonth()]+"'"+String(d.getFullYear()).slice(2); }catch(e){ return ds; } }
  function fmtD(ds){ if(!ds) return '—';
    try{ return new Date(String(ds)+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return ds; } }
  function rs(n){ return 'Rs ' + Math.round(n||0).toLocaleString('en-IN'); }
  // "Mr. Dikshant Kalra" -> "Mr. Kalra"; plain names are used as given
  function salutation(){
    var n = String(CUR.clientName||'').trim();
    if(!n) return 'Sir / Madam';
    var m = n.match(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+(.*)$/i);
    if(m){ var parts=m[2].trim().split(/\s+/); return m[1].replace(/\.$/,'')+'. '+parts[parts.length-1]; }
    return n;
  }
  function addressLines(){
    var out=[];
    if(CUR.venue) out.push(String(CUR.venue));
    else if(CUR.location) out.push(String(CUR.location));
    if(CUR.mobile) out.push('Mobile: '+CUR.mobile);
    return out;
  }

  /* ---------- chrome ---------- */
  var pageNo = 0, curSub='CATERING PROPOSAL';
  function footer(){
    doc.setDrawColor(226,222,214); doc.setLineWidth(.5); doc.line(Mg, H-52, W-Mg, H-52);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.2); doc.setTextColor(150,143,133);
    doc.text('Gourmet Gatherings  ·  A Trademark Brand of Flenbo Foodworks Pvt. Ltd', Mg, H-38);
    doc.text(co.phone2+'  ·  '+co.email2+'  ·  @gatherings.gourmet', W-Mg, H-38, {align:'right'});
    doc.setFontSize(6.8); doc.setTextColor(RED[0],RED[1],RED[2]);
    doc.text('GSTIN '+co.gstin+'     ·     '+co.udyam, Mg, H-25);
    doc.setTextColor(170,164,154);
    doc.text(('0'+pageNo).slice(-2), W-Mg, H-25, {align:'right'});
  }
  function ensure(sp){ if(y+sp > H-72){ footer(); doc.addPage(); header(curSub+' (CONTD.)'); } }
  function header(sub){
    pageNo++;
    if(sub.indexOf('(CONTD.)')<0) curSub=sub;
    var BAND=126, SUB_Y=104;
    doc.setFillColor(CREAM[0],CREAM[1],CREAM[2]); doc.rect(0,0,W,BAND,'F');
    doc.setDrawColor(RED[0],RED[1],RED[2]); doc.setLineWidth(1.8); doc.line(0,BAND,W,BAND);
    if(LOGO && LOGO.full){
      var lw=162, lh=lw*(LOGO.fullH/LOGO.fullW);
      try{ doc.addImage(LOGO.full,'PNG', W/2-lw/2, Math.max(10,(SUB_Y-14-lh)/2), lw, lh); }catch(e){}
    }
    if(sub){
      doc.setFont('helvetica','bold'); doc.setFontSize(9.6); doc.setTextColor(148,141,131);
      doc.text(sub, W/2, SUB_Y, {align:'center', charSpace:2.2});
      doc.setDrawColor(228,224,216); doc.setLineWidth(.5);
      var tw2 = doc.getTextWidth(sub) + sub.length*2.2;
      doc.line(W/2-tw2/2-26, SUB_Y-3.5, W/2-tw2/2-10, SUB_Y-3.5);
      doc.line(W/2+tw2/2+10, SUB_Y-3.5, W/2+tw2/2+26, SUB_Y-3.5);
    }
    y = 158;
  }
  function sectionTitle(t){
    ensure(44); y += 6;
    doc.setDrawColor(RED[0],RED[1],RED[2]); doc.setLineWidth(1.6); doc.line(Mg, y, Mg+20, y);
    doc.setFont('times','bold'); doc.setFontSize(13); doc.setTextColor(INK[0],INK[1],INK[2]);
    doc.text(t.toUpperCase(), Mg+30, y+4.5, {charSpace:0.7}); y += 18;
  }
  function kv(k,v){
    if(v===undefined||v===null||v==='') v='—'; v=String(v); ensure(17);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.4); doc.setTextColor(158,151,141);
    doc.text(k.toUpperCase(), Mg, y, {charSpace:0.7});
    doc.setFontSize(9.8); doc.setTextColor(INK[0],INK[1],INK[2]);
    var l=doc.splitTextToSize(v, W-Mg-Mg-150); doc.text(l, Mg+150, y);
    y += Math.max(15.5, l.length*12.5);
  }
  function para(t,size,lead){
    doc.setFont('helvetica','normal'); doc.setFontSize(size||9.6); doc.setTextColor(BODY[0],BODY[1],BODY[2]);
    var lh = lead||13.6;
    var l=doc.splitTextToSize(t, W-Mg-Mg);
    ensure(l.length*lh+4);
    l.forEach(function(ln){ doc.text(ln, Mg, y); y += lh; });
    y += 6;
  }
  function bulletsHeight(items){
    doc.setFont('helvetica','normal'); doc.setFontSize(9.4);
    var h=0; items.forEach(function(t){ h += doc.splitTextToSize(t, W-Mg-Mg-20).length*11.9 + 3; });
    return h;
  }
  function bullets(items, numbered){
    doc.setFont('helvetica','normal'); doc.setFontSize(9.4);
    items.forEach(function(t,i){
      var l=doc.splitTextToSize(t, W-Mg-Mg-20);
      ensure(l.length*11.9+4);
      doc.setTextColor(RED[0],RED[1],RED[2]); doc.setFontSize(numbered?9:8);
      doc.text(numbered?(i+1)+'.':'•', Mg+3, y);
      doc.setFontSize(9.4); doc.setTextColor(BODY[0],BODY[1],BODY[2]);
      l.forEach(function(ln,j){ doc.text(ln, Mg+20, y + j*11.9); });
      y += l.length*11.9 + 3;
    });
  }
  function headedList(heading, items, numbered){
    ensure(Math.min((heading?16:0)+bulletsHeight(items), H-240));
    if(heading){ doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(INK[0],INK[1],INK[2]);
      doc.text(heading, Mg, y); y += 14; }
    bullets(items, numbered);
  }

  var HIGHLIGHTS = [
    'Operated by a passionate team of culinary professionals and hospitality experts',
    'Multi-brand cloud kitchens with high operational standards',
    'Kitchens certified with ISO 9001, ISO 22000, and HACCP for food safety and quality assurance',
    'Capacity to manage events from 20 to 2000+ guests with on-site and off-site setups',
    'Wide range of menu themes including North Indian, Asian, Continental, Fusion, and Live Counter formats.'
  ];

  /* ================= PAGE 1 : COVER LETTER ================= */
  header('');
  y = 150;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.4); doc.setTextColor(INK[0],INK[1],INK[2]);
  doc.text(letterDate(), Mg, y); y += 26;

  doc.setFont('helvetica','normal'); doc.setFontSize(9.6); doc.setTextColor(INK[0],INK[1],INK[2]);
  doc.text('To,', Mg, y); y += 14;
  doc.setFont('helvetica','bold');
  doc.text(String(CUR.clientName||'Valued Client'), Mg, y); y += 13.5;
  doc.setFont('helvetica','normal'); doc.setTextColor(BODY[0],BODY[1],BODY[2]);
  addressLines().forEach(function(l){ doc.text(l, Mg, y); y += 13; });
  y += 16;

  doc.setFont('helvetica','bold'); doc.setFontSize(10.2); doc.setTextColor(INK[0],INK[1],INK[2]);
  doc.splitTextToSize('Subject: Proposal For Organizing Your Upcoming Event dtd. '+eventDateLong(CUR.eventDate),
                      W-Mg-Mg).forEach(function(l){ doc.text(l, Mg, y); y += 14; });
  y += 16;

  doc.setFont('helvetica','bold'); doc.setFontSize(9.8);
  doc.text('Dear '+salutation()+',', Mg, y); y += 20;

  para('We are delighted to submit our proposal to take up and organize your upcoming event dtd. '+
       eventDateLong(CUR.eventDate)+'. Please find enclosed the detailed annexures covering the event format, '+
       'curated menu options, serving style and other deliverables for your kind perusal.');
  para('At Flenbo Foodworks, we specialize in curated culinary experiences through our flagship catering brand '+
       'Gourmet Gatherings, as well as other innovative food verticals. Whether it’s a private celebration, '+
       'a corporate gathering, or a social function, we pride ourselves on delivering excellence, personalization, '+
       'and seamless execution.');
  y += 2;
  headedList('Some highlights about us:', HIGHLIGHTS);
  y += 6;
  para('Basis your menu choice, we are happy to share our commercial proposal including deliverables. For any '+
       'further clarification or discussion, please feel free to reach out directly. We take a collaborative '+
       'approach and are open to any suggestions, customizations, or special requirements you may have.');
  para('We would be honoured to be a part of your event and look forward to the opportunity to serve you.');
  y += 24;
  doc.setFont('helvetica','normal'); doc.setFontSize(9.6); doc.setTextColor(INK[0],INK[1],INK[2]);
  doc.text('Sincerely,', Mg, y); y += 34;          // room for a signature
  doc.setDrawColor(226,222,214); doc.setLineWidth(.5); doc.line(Mg, y, Mg+150, y); y += 13;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.6);
  doc.text(co.signatory, Mg, y); y += 12;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.4); doc.setTextColor(150,143,133);
  doc.text(co.signatoryRole+', '+co.name, Mg, y);
  footer();

  /* ================= PAGE 2 : EVENT DETAILS ================= */
  doc.addPage(); header('EVENT DETAILS');
  doc.setFillColor(250,247,241); doc.roundedRect(Mg, y-13, 190, 36, 5,5,'F');
  doc.setFont('helvetica','normal'); doc.setFontSize(7.2); doc.setTextColor(158,151,141);
  doc.text('FILE NUMBER', Mg+15, y+1, {charSpace:0.7});
  doc.setFont('times','bold'); doc.setFontSize(15); doc.setTextColor(RED[0],RED[1],RED[2]);
  doc.text(String(CUR.fileNumber||'—'), Mg+15, y+18);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.6); doc.setTextColor(158,151,141);
  doc.text('Quotation date: '+fmtD(new Date().toISOString().slice(0,10)), W-Mg, y+2, {align:'right'});
  doc.text('Valid for 15 days from date of issue', W-Mg, y+14, {align:'right'});
  y += 44;

  sectionTitle('Client Details');
  kv('Client name', CUR.clientName);
  kv('Mobile number', CUR.mobile);
  if(CUR.venue) kv('Venue address', CUR.venue);

  sectionTitle('Event Details');
  kv('Event type', CUR.eventType==='OTHERS'?(CUR.eventTypeOther||'Others'):CUR.eventType);
  kv('Date of event', fmtD(CUR.eventDate));
  kv('Event slot', CUR.eventSlot);
  if(CUR.eventTime) kv('Event time', CUR.eventTime);
  if(CUR.occasion) kv('Occasion', CUR.occasion);
  kv('Guest count / MG', cost.pax+' guests');
  kv('Dietary preference', CUR.dietary);
  kv('Event location', CUR.location);

  sectionTitle('Service Inclusions');
  bullets([
    'Complete food as per the enclosed menu, freshly prepared',
    'Professional chef, stewards and cleaning staff',
    'Buffet tables, premium chafing dishes, 5-star grade porcelain crockery and premium cutlery',
    'Chuk disposables, packaged drinking water and beverages as per the menu',
    'Delivery and logistics to your venue'
  ]);
  sectionTitle('Not Included');
  bullets([
    'Round tables, chairs, stage, backdrop, tenting and seating arrangements',
    'Decor, floral, photography, videography, DJ and any third party services',
    'Any item not listed in the menu or inclusions above'
  ]);
  footer();

  /* ================= PAGE 3 : MENU GRID ================= */
  doc.addPage(); header('MENU OFFERING');
  var byCat={}; cost.lines.forEach(function(l){ (byCat[l.cat]=byCat[l.cat]||[]).push(l.name); });
  var GRID = [
    [['STARTERS','Appetizers/Starters'], ['MAINS','Main Course'],      ['SALADS','Salads']],
    [['CRISPY BITES','Crispy Bites'],    ['RICE','Rice'],              ['SOUPS','Soups']],
    [['LENTILS','Lentils'],              ['ASSORTED BREADS','Breads'], ['DESSERTS','Desserts']],
    [['LIVE COUNTERS','Live Counters'],  ['BEVERAGES','Beverages'],    ['CURD','Curd Preparations']]
  ];
  var placed={}; GRID.forEach(function(r){ r.forEach(function(c){ placed[c[1]]=1; }); });
  var extra=Object.keys(byCat).filter(function(k){ return !placed[k]; });
  while(extra.length){ GRID.push(extra.splice(0,3).map(function(k){ return [k.toUpperCase(), k]; })); }

  var HF=[247,245,250], HT=[64,58,96], CL=[224,220,232], ZEB=[252,251,253];
  var gw=W-Mg-Mg, cw=gw/3, hRow=20, bRow=17.5;
  function cell(x,w,h,txt,mode,zebra){
    if(mode==='head'){ doc.setFillColor(HF[0],HF[1],HF[2]); doc.rect(x,y,w,h,'F'); }
    else if(zebra){ doc.setFillColor(ZEB[0],ZEB[1],ZEB[2]); doc.rect(x,y,w,h,'F'); }
    doc.setDrawColor(CL[0],CL[1],CL[2]); doc.setLineWidth(.55); doc.rect(x,y,w,h);
    if(!txt) return;
    doc.setFont('helvetica', mode==='head'?'bold':'normal');
    doc.setFontSize(mode==='head'?7.5:7.5);
    if(mode==='head'){ doc.setTextColor(HT[0],HT[1],HT[2]); }
    else doc.setTextColor(INK[0],INK[1],INK[2]);
    var l=doc.splitTextToSize(String(txt).toUpperCase(), w-12);
    if(l.length>2) l=l.slice(0,2);
    var ty=y+h/2-((l.length-1)*7)/2+2.4;
    l.forEach(function(ln,i){ doc.text(ln, x+w/2, ty+i*7.4, {align:'center', charSpace: mode==='head'?0.8:0}); });
  }
  GRID.forEach(function(br){
    var cols=br.map(function(c){ return byCat[c[1]]||[]; });
    var rows=Math.max(2, cols[0].length, cols[1].length, cols[2].length);
    if(y + hRow + rows*bRow + 12 > H-80){ footer(); doc.addPage(); header('MENU OFFERING (CONTD.)'); }
    br.forEach(function(c,i){ cell(Mg+i*cw, cw, hRow, c[0], 'head'); });
    y += hRow;
    for(var r=0;r<rows;r++){
      for(var i=0;i<3;i++) cell(Mg+i*cw, cw, bRow, cols[i][r]||'', 'body', r%2===1);
      y += bRow;
    }
    y += 12;
  });
  if(CUR.notes){ y+=4; sectionTitle('Additional Notes'); para(String(CUR.notes)); }
  footer();

  /* ================= PAGE 4 : COMMERCIALS ================= */
  doc.addPage(); header('COMMERCIALS');
  var perHead=p.listPP, gross=perHead*cost.pax, discAmt=gross-p.net, afterD=p.net, total=afterD+p.gst;
  var tw=W-Mg-Mg, cwA=tw*0.54, cwB=tw*0.22;
  function crow(a,b,c,o){
    o=o||{}; ensure(26);
    var h=o.dark?27:23;
    if(o.dark){ doc.setFillColor(INK[0],INK[1],INK[2]); doc.rect(Mg,y-15,tw,h,'F'); }
    else if(o.head){ doc.setFillColor(250,247,241); doc.rect(Mg,y-15,tw,h,'F'); }
    doc.setDrawColor(228,224,216); doc.setLineWidth(.5);
    doc.line(Mg, y-15+h, Mg+tw, y-15+h);
    doc.setFont('helvetica',(o.bold||o.dark||o.head)?'bold':'normal');
    doc.setFontSize(o.head?7.6:(o.dark?10.2:9.6));
    if(o.dark) doc.setTextColor(255,255,255);
    else if(o.head) doc.setTextColor(158,151,141);
    else doc.setTextColor(INK[0],INK[1],INK[2]);
    doc.text(String(a), Mg+12, y, o.head?{charSpace:0.7}:undefined);
    doc.text(String(b), Mg+cwA+cwB-12, y, {align:'right'});
    doc.text(String(c), Mg+tw-12, y, {align:'right'});
    y += h;
  }
  y += 6;
  crow('PARTICULARS','PER PERSON','AMOUNT',{head:true});
  crow('Custom catering package  ('+cost.pax+' guests)', rs(perHead), rs(gross));
  if(p.discountPct>0){
    crow('Less: special discount ('+String(p.discountPct.toFixed(1)).replace(/\.0$/,'')+'%)','','- '+rs(discAmt));
    crow('Total after discount', rs(afterD/cost.pax), rs(afterD), {bold:true});
  }
  crow('GST @ '+dr.gst+'%','', rs(p.gst));
  crow('TOTAL PAYABLE', rs(total/cost.pax), rs(total), {dark:true});
  y += 16;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.2); doc.setTextColor(INK[0],INK[1],INK[2]);
  doc.splitTextToSize('INR: '+C.words(total).replace(' only',' Only'), tw).forEach(function(l){
    ensure(14); doc.text(l, Mg, y); y += 13; });
  y += 18;
  sectionTitle('Payment Schedule');
  bullets([
    String(dr.advancePct)+'% advance on confirmation of the order',
    'Balance '+String(100-dr.advancePct)+'% on the day of the event, before team demobilization',
    'Credit card payments attract an additional '+dr.cardSurcharge+'% on the invoice amount'
  ]);
  y += 4;
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(150,143,133);
  doc.splitTextToSize('This proposal is valid for 15 days from the date of issue. Detailed Terms & Conditions follow on the next pages.', tw)
    .forEach(function(l){ ensure(12); doc.text(l, Mg, y); y += 11; });
  footer();

  /* ================= PAGES 5+ : TERMS ================= */
  doc.addPage(); header('TERMS & CONDITIONS');
  para("Gourmet Gatherings is Delhi NCR's premium culinary and experiential hospitality brand, operated by Flenbo "+
       "Foodworks Private Limited. Whether it's a private celebration, a corporate gathering, or a social function, "+
       "we pride ourselves on delivering excellence, personalization, and seamless execution.");
  y += 2;
  headedList('Some highlights about us:', HIGHLIGHTS);
  y += 6;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(INK[0],INK[1],INK[2]);
  ensure(18);
  doc.splitTextToSize('Order confirmation in the form of Advance Payment implies acceptance of these terms:', W-Mg-Mg)
    .forEach(function(l){ doc.text(l, Mg, y); y += 13; });
  y += 8;
  QTERMS.forEach(function(sec){
    ensure(Math.min(46+bulletsHeight(sec[2]), H-240));
    sectionTitle(sec[0]);
    if(sec[1]) headedList(sec[1], sec[2], true); else bullets(sec[2]);
    if(sec[3]){ y+=6; headedList(sec[3], sec[4], true); }
  });
  ensure(150);
  sectionTitle('Acceptance');
  para('By confirming the order and making advance payment, the client agrees to all the above Terms & Conditions.');
  y += 6;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.6); doc.setTextColor(INK[0],INK[1],INK[2]);
  doc.text('Warm regards,', Mg, y); y += 14;
  doc.text(co.name, Mg, y); y += 16;
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(BODY[0],BODY[1],BODY[2]);
  doc.text(co.phone2, Mg, y); y += 12.5;
  doc.text(co.email2, Mg, y); y += 12.5;
  doc.text('@gatherings.gourmet', Mg, y);
  footer();

  return doc;
}

function quoteFileName(){
  return 'Gourmet-Gatherings-Quote-' + ((CUR&&CUR.fileNumber)||'event') + '.pdf';
}
function downloadQuotePdf(){
  try{ buildQuotePdf().save(quoteFileName()); toast('Quote PDF downloaded','ok'); }
  catch(e){ toast(e.message||'Could not build the PDF','err'); }
}
function waNumber(){
  var d = String((CUR&&CUR.mobile)||'').replace(/\D/g,'');
  if(!d) return '';
  if(d.length===10) d = '91'+d;
  if(d.length===11 && d.charAt(0)==='0') d = '91'+d.slice(1);
  return d;
}
function waMessage(){
  var p = window._ggLast.price, cost = window._ggLast.cost;
  return 'Dear '+((CUR&&CUR.clientName)||'Client')+',\n\n'+
    'Thank you for considering Gourmet Gatherings. Please find our proposal attached.\n\n'+
    'Event: '+((CUR&&CUR.eventType)||'')+'\n'+
    'Date: '+((CUR&&CUR.eventDate)||'')+'\n'+
    'Guests (MG): '+cost.pax+'\n'+
    'Per person: '+M(p.netPP)+'\n'+
    'Total incl. GST: '+M(p.grand)+'\n\n'+
    'File reference: '+((CUR&&CUR.fileNumber)||'')+'\n\n'+
    'Warm regards,\nGourmet Gatherings\nA brand of Flenbo Foodworks Pvt. Ltd\n+91 93118 77987';
}
function sendQuoteWhatsapp(){
  var num = waNumber();
  var msg = waMessage();
  var doc;
  try{ doc = buildQuotePdf(); }
  catch(e){ toast(e.message||'Could not build the PDF','err'); return; }
  var blob = doc.output('blob');
  var file = new File([blob], quoteFileName(), {type:'application/pdf'});

  // Phone / tablet: share the PDF straight into WhatsApp
  if(navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file], text:msg, title:'Gourmet Gatherings — Quotation'})
      .then(function(){ toast('Shared','ok'); })
      .catch(function(){ /* user dismissed */ });
    return;
  }
  // Desktop: download the PDF, open the chat with the message ready, then attach
  doc.save(quoteFileName());
  var url = num ? ('https://wa.me/'+num+'?text='+encodeURIComponent(msg))
                : ('https://web.whatsapp.com/send?text='+encodeURIComponent(msg));
  window.open(url, '_blank');
  toast('PDF downloaded — attach it in the WhatsApp window','ok');
}

/* ---------- save costing back onto the event ---------- */
function saveToEvent(){
  if(!CUR || !S){ toast('Select an event first','err'); return; }
  var d = window._ggLast;
  var patch = { costing: {
    transport:OPT.transport, season:OPT.season, gm:OPT.gm,
    negotiation:OPT.negotiation, discount:OPT.discount, labour:OPT.labour,
    cogs:d.cost.cogs, cogsPP:d.cost.cogsPP, listPP:d.price.listPP,
    netPP:d.price.netPP, net:d.price.net, gst:d.price.gst, grand:d.price.grand,
    marginPct:d.price.marginPct, floorPP:d.price.floorPP, savedAt:new Date().toISOString()
  }};
  S.update(CUR.fileNumber, patch, 'Admin').then(function(){
    CUR.costing = patch.costing;
    toast('Costing saved to File '+CUR.fileNumber,'ok');
  });
}

/* ---------- csv ---------- */
function rationCsv(){
  var r = window._ggRation; if(!r){ toast('Nothing to export','err'); return; }
  var rows=[['Vendor','Mode','Raw material','Needs','Unit','Order','Packs','Pack size','Pack unit','Rate','Value','Re-order']];
  r.vendors.forEach(function(v){ r.byVendor[v].forEach(function(x){
    rows.push([v,x.mode,x.name,x.need.toFixed(3),x.unit,x.order.toFixed(3),x.packs==null?'':x.packs,x.pack,x.packu,x.rate,x.val.toFixed(2),x.reorder?'YES':'']);
  });});
  var csv = rows.map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='ration-'+((CUR&&CUR.fileNumber)||'event')+'.csv'; a.click();
}

/* ---------- boot ---------- */
function boot(){
  if(!$('.admin-nav')) return setTimeout(boot,400);
  injectPages();
  $('#cEvent').onchange = function(){ pick(+this.value); };
  $('#cQuoteBtn').onclick = downloadQuotePdf;
  $('#cWaBtn').onclick = sendQuoteWhatsapp;
  $('#cSaveBtn').onclick = saveToEvent;
  $('#rBuf').onchange = renderRation;
  $('#rPack').onchange = renderRation;
  $('#rCsv').onclick = rationCsv;
  $('#rateSearch').oninput = renderRates;
  $('#rateVendor').onchange = renderRates;
  $('#rateReset').onclick = function(){ if(confirm('Reset all rates and drivers to defaults?')){ C.reset(); renderRates(); if(CUR) render(); toast('Reset','ok'); } };
  $('#rateExport').onclick = function(){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(C.settings(),null,2)],{type:'application/json'}));
    a.download='gg-costing-backup-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
  };
  $('#rateImport').onchange = function(e){
    var f=e.target.files[0]; if(!f) return;
    var rd=new FileReader();
    rd.onload=function(){ try{ localStorage.setItem('gg_costing_v1', rd.result); location.reload(); }catch(err){ toast('Could not read that file','err'); } };
    rd.readAsText(f);
  };
  loadEvents();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
window.GG_COST_UI = { reload:loadEvents, render:render };
})();
