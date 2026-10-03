// 页面渲染（GitHub Repo 垂直；纯 HTML 字符串）

export const CSS = `
:root{--bg:#0b0e14;--card:#141925;--line:#222a3a;--fg:#e8ecf4;--mut:#8b95a7;--acc:#5b8cff}
*{box-sizing:border-box}body{margin:0;font:15px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{max-width:920px;margin:0 auto;padding:48px 22px}h1{font-size:30px;margin:0 0 6px}
.sub{color:var(--mut);margin-bottom:22px}a{color:#9db8ff}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:16px 0}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.row{display:flex;gap:10px;flex-wrap:wrap}
input{flex:1;min-width:220px;background:#0d1119;border:1px solid var(--line);border-radius:9px;color:var(--fg);padding:11px 13px}
button{padding:11px 18px;border-radius:9px;border:1px solid var(--acc);background:var(--acc);color:#fff;font-weight:600;cursor:pointer}
button.ghost{background:transparent;color:#cdd9ff}code{background:#0d1119;border:1px solid var(--line);border-radius:6px;padding:2px 7px;font-size:12.5px}
pre{background:#0d1119;border:1px solid var(--line);border-radius:10px;padding:14px;overflow:auto;font-size:12.5px;max-height:300px}
.muted{color:var(--mut);font-size:13px}.pill{display:inline-block;background:#0d1119;border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:12px;margin:3px}
@media(max-width:760px){.grid{grid-template-columns:1fr}}
`;

const DEFAULT_DESC = 'Track releases, stars, issues and pushes of any public GitHub repo. Free CLI quota, Hobby $9/mo in USDC.'
const shell = (title, body, desc=DEFAULT_DESC) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="description" content="${desc}">\n<link rel="icon" type="image/png" href="/favicon.png">\n<meta property="og:type" content="website">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${desc}">\n<meta property="og:image" content="/og.png">\n<meta name="twitter:card" content="summary_large_image">\n<title>${title}</title><style>${CSS}</style></head><body><div class="wrap">${body}</div></body></html>`;

export function renderHome() {
    return shell('GitHub Repo Change Intelligence', `
<h1>GitHub Repo Change Intelligence</h1>
<p class="sub">Track new releases and maintenance activity for public GitHub repositories. Free snapshot · paid intel in <b>USDC on Base</b> via <b>x402</b>.</p>
<div class="card">
<label class="muted">Try free — owner/repo</label>
<div class="row"><input id="t" value="facebook/react"><button onclick="run()">Get snapshot</button></div>
<pre id="out">// result</pre>
<div id="up" style="display:none;border-color:var(--acc);background:linear-gradient(180deg,rgba(91,140,255,.10),var(--card))">
<b>That's the current state.</b><p class="muted">A <code>$0.05</code> changes call shows exactly what's new since your last check — releases, stars, issues. Watching it continuously with alerts starts at $99/month.</p>
<div class="row"><a href="/pricing"><button type="button">See plans</button></a></div>
</div>
</div>
<div class="grid">
<div class="card"><b>Free</b><p class="muted">Stars, issues, last push, releases</p><code>/v1/snapshot</code></div>
<div class="card"><b>$0.05</b><p class="muted">New/removed releases & prereleases</p><code>repo_changes</code></div>
<div class="card" style="border-color:var(--acc)"><b>$0.50 ⭐</b><p class="muted">Project-health & maintenance report</p><code>repo_intel_report</code></div>
</div>
<div class="card"><b>For teams scanning many repositories</b><p class="muted"><code>$0.03 / repo</code> batch (up to 50) &nbsp;·&nbsp; <code>$5</code> landscape (up to 10 repos) with star ranking and abandoned-project flags.</p></div>
<div class="card" style="border-color:var(--acc);background:linear-gradient(180deg,rgba(91,140,255,.10),var(--card))">
<b>Continuous repository intelligence?</b><p class="muted">Watch dependencies and projects, get alerted on new releases. From <b>$99/month</b>, USDC, instant key.</p>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><a href="/pricing"><button type="button">See plans</button></a><a href="/dashboard"><button type="button" class="ghost">Dashboard</button></a></div>
</div>
<p class="muted"><a href="/pricing">pricing</a> · <a href="/dashboard">dashboard</a> · <a href="/status">status</a> · <a href="/health">health</a> · <a href="/terms">terms</a> · <a href="/privacy">privacy</a> · <a href="/contact">contact</a></p>
<script>
async function run(){const o=document.getElementById('out');o.textContent='loading…';
 try{const r=await fetch('/v1/snapshot?target='+encodeURIComponent(document.getElementById('t').value));o.textContent=JSON.stringify(await r.json(),null,2);document.getElementById('up').style.display='block';}
 catch(e){o.textContent='error '+e;}}
</script>`);
}

// Product changelog (reverse chronological). Rendered at /changelog.
export const CHANGELOG = [
  { date: '2026-10-01', tag: 'Growth', items: [
    'Hobby $9 entry plan launched across the product line.',
    'Free CLI with per-install quota: changes/intel 20, batch/landscape 3 per 30 days.',
    'Product surfaces now share one access key across all five intelligence feeds.',
  ]},
  { date: '2026-09-30', tag: 'Discovery', items: [
    'Added llms.txt and /docs for AI-agent discoverability.',
    'Public /status page with live browser-side health probes.',
    'Landing page now bridges snapshot results into a clear upgrade path.',
  ]},
  { date: '2026-09-29', tag: 'Platform', items: [
    'Listed on the official MCP Registry, Smithery and Glama.',
    'Self-serve /pricing checkout and /dashboard with webhook + email alerts.',
    'Company-grade hardening: no key custody, SSRF guard, per-key rate limits.',
  ]},
];

export function renderChangelog(productName = 'Change Intelligence') {
    const rows = CHANGELOG.map(r => `
<div class="cl-card">
  <div class="cl-head"><span class="cl-date">${r.date}</span><span class="cl-tag">${r.tag}</span></div>
  <ul>${r.items.map(i => `<li>${i}</li>`).join('')}</ul>
</div>`).join('');
    return shell('Changelog · ' + productName, `
<h1>Changelog</h1><p class="sub">What shipped, most recent first.</p>
${rows}
<style>
.cl-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:14px 0}
.cl-head{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.cl-date{font-weight:700}.cl-tag{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--acc);border:1px solid var(--line);border-radius:999px;padding:2px 10px}
.cl-card ul{margin:0;padding-left:20px}.cl-card li{padding:3px 0;font-size:14px}
</style>`);
}

export function renderPricing(Plans) {
    const cards = Object.values(Plans).map((p, i) => `
<div class="plan${i === 1 ? ' hl' : ''}">${i === 1 ? '<div class="pop">Most popular</div>' : ''}
<div class="pname">${p.name}</div><div class="price"><span class="amt">$${p.price}</span><span class="per">/month</span></div>
<ul>${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
<button class="cta" data-plan="${p.id}">Choose ${p.name}</button></div>`).join('');
    return shell('Pricing · GitHub Repo Change Intelligence', `
<h1 style="text-align:center">Plans &amp; pricing</h1><p class="sub" style="text-align:center">Billed in <b>USDC on Base</b> — no card needed, or <a href="https://pixharvest.com/pricing" style="color:#9db8ff">pay by card at pixharvest.com</a> (9/9/99/mo) · <a href="mailto:contentforge.press@outlook.com" style="color:#9db8ff">email us</a>.</p>
<div class="grid2">${cards}</div>
<div class="card" id="paybox" style="display:none"></div>
<p class="sub" style="text-align:center;margin-top:26px">Paying directly with USDC? No AI wallet needed — click a plan above, send the exact amount, your key is issued automatically.</p>
<style>
.grid2{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
#paybox .payrow{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:14px}
#paybox .payrow b{word-break:break-all;text-align:right}
#paybox .big{font-size:26px;font-weight:700;color:var(--acc)}
#paybox button{margin-top:14px;padding:11px 18px;background:var(--acc);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:15px}
.plan{position:relative;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px 22px;display:flex;flex-direction:column}
.plan.hl{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc)}
.pop{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--acc);font-size:11px;padding:4px 12px;border-radius:999px}
.pname{font-size:14px;color:var(--mut);text-transform:uppercase}.amt{font-size:40px;font-weight:700}.per{color:var(--mut)}
ul{list-style:none;padding:0;margin:0 0 20px;flex:1}li{padding:8px 0 8px 26px;position:relative;font-size:14px;border-bottom:1px solid rgba(255,255,255,.04)}
li:before{content:"✓";position:absolute;left:0;color:var(--acc)}.cta{margin-top:auto;width:100%;padding:12px;background:transparent;color:#cdd9ff;border:1px solid var(--acc);border-radius:10px;cursor:pointer;font-size:15px}
.plan.hl .cta{background:var(--acc);color:#fff}
@media(max-width:860px){.grid2{grid-template-columns:1fr}}
</style>
<script>
let timer=null;
document.querySelectorAll('.cta').forEach(b=>b.onclick=async()=>{
 const box=document.getElementById('paybox');box.style.display='block';box.innerHTML='Preparing order…';
 clearInterval(timer);
 const r=await fetch('/v1/order?plan='+b.dataset.plan);const o=await r.json();
 if(o.error){box.textContent=o.error;return;}
 box.innerHTML=
  '<div class="payrow"><span>Plan</span><b>'+o.planName+'</b></div>'+
  '<div class="payrow"><span>Send exactly</span><b class="big">'+o.amountUsd+' USDC</b></div>'+
  '<div class="payrow"><span>Network</span><b>Base (ERC-20)</b></div>'+
  '<div class="payrow"><span>To address</span><b>'+o.payTo+'</b></div>'+
  '<p class="sub" style="margin-top:12px">Send the <b>exact</b> amount from any exchange or wallet (Coinbase / Binance / MetaMask…). Order expires in 60 minutes.</p>'+
  '<div id="pstatus" class="sub">Waiting for payment… (confirming automatically)</div>';
 timer=setInterval(async()=>{
  const c=await (await fetch('/v1/order/check?id='+o.orderId)).json();
  if(c.status==='paid'){clearInterval(timer);document.getElementById('pstatus').innerHTML='✅ Payment confirmed. Your access key: <b>'+c.accessKey+'</b> — save it and open the <a href="/dashboard">Dashboard</a>.';}
  else if(c.status==='expired'){clearInterval(timer);document.getElementById('pstatus').textContent='Order expired. Please start again.';}
 },6000);
});
</script>`);
}

export function renderDashboard() {
    return shell('Dashboard · GitHub Repo Change Intelligence', `
<h1>Repository intelligence dashboard</h1><p class="sub"><a href="/pricing">Plans</a> · <a href="/">Home</a></p>
<div id="lv"><div class="row"><input id="key" placeholder="Paste access key (sci_)" style="flex:1"><button onclick="connect()">Open</button></div><p class="sub" id="lerr"></p></div>
<div id="app" style="display:none">
<div class="row" style="justify-content:space-between"><div><span class="pill" id="plan"></span><span class="pill" id="exp"></span><span class="pill" id="cnt"></span></div><button id="rb" onclick="refreshAll()">Refresh all</button></div>
<div class="row" style="margin:12px 0"><input id="nt" placeholder="owner/repo" style="flex:1"><button onclick="addT()">Add repository</button></div>
<div id="list"></div>
<div class="card"><b>Webhook</b><input id="wh" style="width:100%;margin-top:6px"><b style="display:block;margin-top:10px">Email</b><input id="em" style="width:100%;margin-top:6px"><div style="margin-top:10px"><button class="ghost" onclick="saveS()">Save</button></div></div>
</div>
<script>
let st=null;const $=id=>document.getElementById(id);
function connect(){fetch('/v1/watch?key='+encodeURIComponent($('key').value.trim())).then(r=>r.json()).then(d=>{if(d.error){$('lerr').textContent=d.error;return;}st=d;$('lv').style.display='none';$('app').style.display='block';render();});}
function render(){$('plan').textContent=st.plan;$('exp').textContent=(st.active?'':'EXPIRED ')+st.expiresAt.slice(0,10);$('cnt').textContent=st.targets.length+' repos';$('wh').value=st.webhookUrl;$('em').value=st.alertEmail;
 $('list').innerHTML=st.targets.length?st.targets.map(t=>'<div class="card"><b>'+t.target+'</b> <span class="muted">'+(t.lastChecked||'not checked')+'</span><div class="row" style="margin-top:8px"><button class="ghost" onclick="refreshOne(\\''+t.target+'\\')">Check</button><button class="ghost" onclick="rm(\\''+t.target+'\\')">Remove</button></div></div>').join(''):'<p class="muted">Add your first repository.</p>';}
function post(p,b){return fetch(p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json());}
function addT(){post('/v1/watch/add?key='+encodeURIComponent(st.accessKey),{target:$('nt').value.trim()}).then(d=>{if(!d.error){st=d;$('nt').value='';render();}});}
function rm(x){post('/v1/watch/remove?key='+encodeURIComponent(st.accessKey),{target:x}).then(d=>{if(!d.error){st=d;render();}});}
function refreshOne(x){fetch('/v1/watch/refresh?key='+encodeURIComponent(st.accessKey)+'&target='+encodeURIComponent(x)).then(r=>r.json()).then(d=>{if(!d.error){st=d;render();}});}
function refreshAll(){$('rb').textContent='…';fetch('/v1/watch/refresh?key='+encodeURIComponent(st.accessKey)).then(r=>r.json()).then(d=>{if(!d.error){st=d;render();}}).finally(()=>$('rb').textContent='Refresh all');}
function saveS(){post('/v1/watch/settings?key='+encodeURIComponent(st.accessKey),{webhookUrl:$('wh').value.trim(),alertEmail:$('em').value.trim()}).then(()=>alert('Saved'));}
</script>`);
}

export function renderStatus(name, probeTarget) {
    return shell('Status · ' + name, `
<h1>System status</h1><p class="sub">Live checks run from your browser. <a href="/">Home</a></p>
<div id="rows" class="card"></div>
<p class="muted" id="updated"></p>
<script>
const checks=[
 ['API','/health'],
 ['Snapshot (data source)','/v1/snapshot?target='+encodeURIComponent(${JSON.stringify(probeTarget)})],
 ['MCP endpoint','/mcp'],
 ['Docs','/docs'],
];
async function probe([label,u]){
 const t0=performance.now();let ok=false,code='',ms=0;
 try{const c=new AbortController();setTimeout(()=>c.abort(),8000);
  const r=await fetch(u,{method:'GET',signal:c.signal});code=r.status;ms=Math.round(performance.now()-t0);
  ok=r.status===200||r.status===400||r.status===405||r.status===402||r.status===406;}
 catch(e){code='ERR';}
 return {label,ok,code,ms};
}
(async()=>{
 const res=await Promise.all(checks.map(probe));
 document.getElementById('rows').innerHTML=res.map(x=>
  '<div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)">'+
  '<span>'+x.label+'</span><span style="color:'+(x.ok?'#56d364':'#ff7b72')+'">'+(x.ok?'● Operational':'● Down')+' <span class="muted">'+x.code+(x.ms?' · '+x.ms+'ms':'')+'</span></span></div>').join('');
 document.getElementById('updated').textContent='Updated '+new Date().toUTCString();
})();
</script>`);
}

export function renderLegal(title, cfg) {
    const email = cfg.CONTACT_EMAIL;
    const body = title.startsWith('Privacy')
        ? '<p>We process the owner/repo you query and repository metadata already public on GitHub. Payments settle peer-to-peer in USDC via x402; we do not collect cards. We do not sell personal data.</p>'
        : title.startsWith('Terms')
            ? '<p>Data is read from the public GitHub API and provided "as is". Use lawfully; respect GitHub terms and rate limits. Paid requests in USDC on Base are generally non-refundable once delivered.</p>'
            : `<p>General, security or abuse reports: <a href="mailto:${email}">${email}</a>.</p>`;
    return shell(title, `<h1>${title}</h1><p class="muted">Last updated 2026-10-01 · <a href="/">Home</a></p>${body}`);
}
