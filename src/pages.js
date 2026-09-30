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

const shell = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${CSS}</style></head><body><div class="wrap">${body}</div></body></html>`;

export function renderHome() {
    return shell('GitHub Repo Change Intelligence', `
<h1>GitHub Repo Change Intelligence</h1>
<p class="sub">Track new releases and maintenance activity for public GitHub repositories. Free snapshot · paid intel in <b>USDC on Base</b> via <b>x402</b>.</p>
<div class="card">
<label class="muted">Try free — owner/repo</label>
<div class="row"><input id="t" value="facebook/react"><button onclick="run()">Get snapshot</button></div>
<pre id="out">// result</pre>
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
<p class="muted"><a href="/pricing">pricing</a> · <a href="/dashboard">dashboard</a> · <a href="/health">health</a> · <a href="/terms">terms</a> · <a href="/privacy">privacy</a> · <a href="/contact">contact</a></p>
<script>
async function run(){const o=document.getElementById('out');o.textContent='loading…';
 try{const r=await fetch('/v1/snapshot?target='+encodeURIComponent(document.getElementById('t').value));o.textContent=JSON.stringify(await r.json(),null,2);}
 catch(e){o.textContent='error '+e;}}
</script>`);
}

export function renderPricing(Plans) {
    const cards = Object.values(Plans).map((p, i) => `
<div class="plan${i === 1 ? ' hl' : ''}">${i === 1 ? '<div class="pop">Most popular</div>' : ''}
<div class="pname">${p.name}</div><div class="price"><span class="amt">$${p.price}</span><span class="per">/month</span></div>
<ul>${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
<button class="cta" data-plan="${p.id}">Choose ${p.name}</button></div>`).join('');
    return shell('Pricing · GitHub Repo Change Intelligence', `
<h1 style="text-align:center">Plans &amp; pricing</h1><p class="sub" style="text-align:center">Billed in <b>USDC on Base</b> — no card.</p>
<div class="grid2">${cards}</div>
<div class="card" id="paybox" style="display:none"><pre id="payjson"></pre></div>
<style>
.grid2{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
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
document.querySelectorAll('.cta').forEach(b=>b.onclick=async()=>{
 const box=document.getElementById('paybox');box.style.display='block';document.getElementById('payjson').textContent='loading…';
 const r=await fetch('/v1/subscribe?plan='+b.dataset.plan,{method:'POST'});const j=await r.json();
 document.getElementById('payjson').textContent=r.status===402?JSON.stringify(j,null,2):JSON.stringify(j,null,2);
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

export function renderLegal(title, cfg) {
    const email = cfg.CONTACT_EMAIL;
    const body = title.startsWith('Privacy')
        ? '<p>We process the owner/repo you query and repository metadata already public on GitHub. Payments settle peer-to-peer in USDC via x402; we do not collect cards. We do not sell personal data.</p>'
        : title.startsWith('Terms')
            ? '<p>Data is read from the public GitHub API and provided "as is". Use lawfully; respect GitHub terms and rate limits. Paid requests in USDC on Base are generally non-refundable once delivered.</p>'
            : `<p>General, security or abuse reports: <a href="mailto:${email}">${email}</a>.</p>`;
    return shell(title, `<h1>${title}</h1><p class="muted">Last updated 2026-10-01 · <a href="/">Home</a></p>${body}`);
}
