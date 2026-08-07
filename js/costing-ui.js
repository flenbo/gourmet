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
      '<button class="btn sm btn-ghost" id="cQuoteBtn">Print quote</button>'+
      '<button class="btn sm btn-ghost" id="cInvBtn">Print invoice</button>'+
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
  OPT.labour      = saved.labour ? saved.labour.slice() : C.settings().labour.map(function(l){ return {role:l.role,rate:l.rate,count:l.count}; });
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

/* ---------- documents ---------- */
function printDoc(html){
  var w = window.open('','_blank');
  if(!w){ toast('Allow pop-ups to print','err'); return; }
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gourmet Gatherings</title>'+
    '<style>body{font:12px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:26px}'+
    'h1{font-size:19px;text-align:center;letter-spacing:.07em;text-transform:uppercase;margin:0 0 14px}'+
    'h2{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#1F3864;margin:16px 0 6px}'+
    'table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}'+
    'th{background:#e8ecf7;color:#1F3864;border:1px solid #c9cfe0;padding:5px 7px;text-align:left;font-size:10px}'+
    'td{border:1px solid #d8dce6;padding:5px 7px}.num{text-align:right}'+
    '.co{border-bottom:2px solid #111;padding-bottom:9px;margin-bottom:12px}'+
    '.co .nm{font-size:16px;font-weight:700}.co .sub{font-size:10.5px;color:#555;line-height:1.5}'+
    '.tot{display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #d8dce6}'+
    '.tot.g{border-top:2px solid #111;font-size:14px;font-weight:700;padding-top:8px}'+
    '.fine{font-size:10px;color:#555;line-height:1.6}.box{border:1px solid #d8dce6;border-radius:5px;padding:9px 11px;margin-bottom:9px}'+
    '.cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}@page{margin:14mm}</style></head><body>'+html+'</body></html>');
  w.document.close(); setTimeout(function(){ w.print(); }, 350);
}
function coHead(){
  var co = C.settings().company;
  return '<div class="co"><div class="nm">'+esc(co.name)+'</div><div class="sub">'+esc(co.addr)+'<br>'+
    'Phone: '+esc(co.phone2)+' · Email: '+esc(co.email2)+'<br>GSTIN: '+esc(co.gstin)+' · PAN: '+esc(co.pan)+' · State: '+esc(co.state)+'</div></div>';
}
function quoteDoc(){
  var d = window._ggLast; if(!d||!CUR){ toast('Select an event first','err'); return; }
  var co = C.settings().company, p = d.price, c = d.cost;
  var byCat = {};
  c.lines.forEach(function(l){ (byCat[l.cat]=byCat[l.cat]||[]).push(l.name); });
  printDoc(coHead()+'<h1>Proposal</h1>'+
    '<div class="cols"><div class="box"><b>To</b><br>'+esc(CUR.clientName||'')+'<br>'+esc(CUR.venue||CUR.location||'')+'<br>'+esc(CUR.mobile||'')+'</div>'+
    '<div class="box"><b>Event</b><br>'+esc(CUR.eventType||'')+' · '+esc(CUR.eventDate||'')+'<br>'+esc(CUR.eventSlot||'')+
    '<br>MG: '+c.pax+' guests · File '+esc(CUR.fileNumber||'')+'</div></div>'+
    '<h2>Menu offering</h2><table><tbody>'+
    Object.keys(byCat).map(function(k){ return '<tr><th style="width:170px">'+esc(k)+'</th><td>'+byCat[k].map(esc).join(' · ')+'</td></tr>'; }).join('')+
    '</tbody></table>'+
    '<h2>Commercials</h2><table><tbody>'+
    '<tr><td>Catering package — '+c.pax+' guests</td><td class="num">'+M(p.listPP)+' / guest</td><td class="num">'+M(p.list)+'</td></tr>'+
    '<tr><td>Discount</td><td class="num">'+N(p.discountPct,1)+'%</td><td class="num">−'+M(p.discountAmt)+'</td></tr>'+
    '<tr><td><b>Total after discount</b></td><td class="num"><b>'+M(p.netPP)+' / guest</b></td><td class="num"><b>'+M(p.net)+'</b></td></tr>'+
    '<tr><td>GST @ '+C.settings().drivers.gst+'%</td><td class="num"></td><td class="num">'+M(p.gst)+'</td></tr>'+
    '<tr><th>TOTAL</th><th></th><th class="num">'+M(p.grand)+'</th></tr>'+
    '</tbody></table><p class="fine"><b>'+esc(C.words(p.grand))+'</b></p>'+
    '<h2>Terms &amp; conditions</h2><p class="fine">'+(C.DATA.terms||[]).map(function(t){return '&bull; '+esc(t);}).join('<br>')+'</p>');
}
function invoiceDoc(){
  var d = window._ggLast; if(!d||!CUR){ toast('Select an event first','err'); return; }
  var co = C.settings().company, inv = C.invoiceFor(CUR, {price:d.price});
  var no = CUR.invoiceNo || (co.fy+'/'+co.invoiceSeq);
  printDoc(coHead()+'<h1>Tax Invoice</h1>'+
    '<div class="cols"><div class="box"><b>Bill To</b><br>'+esc(CUR.clientName||'')+'<br>'+esc(CUR.venue||CUR.location||'')+
      '<br>Contact: '+esc(CUR.mobile||'')+' · State: '+esc(co.state)+'</div>'+
    '<div class="box"><b>Invoice Details</b><br>Invoice No.: '+esc(no)+'<br>Date: '+esc(new Date().toLocaleDateString('en-GB'))+
      '<br>Place of Supply: '+esc(co.state)+'</div></div>'+
    '<table><thead><tr><th>#</th><th>Item</th><th>HSN/SAC</th><th class="num">Qty</th><th>Unit</th>'+
    '<th class="num">Price/Unit</th><th class="num">Discount</th><th class="num">GST</th><th class="num">Amount</th></tr></thead><tbody>'+
    '<tr><td>1</td><td><b>'+esc(inv.itemName)+'</b></td><td>'+esc(inv.hsn)+'</td><td class="num">'+inv.qty+'</td><td>'+esc(inv.unit)+'</td>'+
    '<td class="num">'+M2(inv.rate)+'</td><td class="num">'+M2(inv.discAmt)+' ('+N(inv.discPct,1)+'%)</td>'+
    '<td class="num">'+M2(inv.gstAmt)+' ('+inv.gstPct+'%)</td><td class="num">'+M2(inv.amount)+'</td></tr>'+
    '</tbody></table>'+
    '<h2>Tax summary</h2><table><thead><tr><th>HSN/SAC</th><th class="num">Taxable</th><th class="num">CGST</th><th class="num">SGST</th><th class="num">Total tax</th></tr></thead>'+
    '<tbody><tr><td>'+esc(inv.hsn)+'</td><td class="num">'+M2(inv.taxable)+'</td><td class="num">'+M2(inv.cgst)+'</td><td class="num">'+M2(inv.sgst)+'</td><td class="num">'+M2(inv.gstAmt)+'</td></tr></tbody></table>'+
    '<div class="cols"><div><div class="box fine"><b>Bank Details</b><br>'+esc(co.bankName)+'<br>A/c: '+esc(co.bankAc)+'<br>IFSC: '+esc(co.bankIfsc)+'<br>'+esc(co.bankHolder)+'</div></div>'+
    '<div><div class="tot"><span>Sub Total</span><b>'+M2(inv.amount)+'</b></div>'+
    '<div class="tot"><span>Round Off</span><b>'+(inv.roundOff>=0?'+':'')+N(inv.roundOff,2)+'</b></div>'+
    '<div class="tot g"><span>Total</span><b>'+M(inv.total)+'</b></div>'+
    '<div class="tot"><span>Advance ('+C.settings().drivers.advancePct+'%)</span><b>'+M(inv.advance)+'</b></div>'+
    '<div class="tot"><span>Balance</span><b>'+M(inv.balance)+'</b></div>'+
    '<div class="tot"><span>You Saved</span><b>'+M2(inv.saved)+'</b></div></div></div>'+
    '<p class="fine"><b>'+esc(inv.words)+'</b></p>'+
    '<p class="fine">GST @ 5% (without ITC) under HSN/SAC 996334 (Catering Services). Payment due on receipt unless agreed in writing. '+
    'Credit card payment attracts an additional '+C.settings().drivers.cardSurcharge+'%. All disputes subject to Gurugram, Haryana jurisdiction. '+
    'This invoice is system-generated and does not require a physical signature.</p>');
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
  $('#cQuoteBtn').onclick = quoteDoc;
  $('#cInvBtn').onclick = invoiceDoc;
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
