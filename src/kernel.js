// Intel Kernel — 通用"变化情报"引擎（零依赖，Cloudflare Workers）
// 适配器只需提供数据获取/归一化/差异/总结；本引擎负责 x402 收银、订阅、
// Dashboard、MCP、定时扫描、合规与静态发现。一次编写，N 个垂直复用。

export const json = (data, status = 200, headers = {}) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

import { telemetry, readTelemetry } from './telemetry.js';

// ERC-8004 / The Spawn 风格的机器可读 agent 元数据。
// 不依赖链上 mint；indexer/agent/人可直接发现能力、端点与付费方式。
export function buildAgentMeta(cfg, A, origin) {
    const host = origin ? origin.replace(/^https?:\/\//, '') : cfg.HOST;
    const base = origin || `https://${host}`;
    const name = A.title || cfg.TITLE || cfg.NAME || 'Change Intelligence';
    const longDesc = cfg.AGENT_DESCRIPTION ||
        `${name} for autonomous AI agents. Free public snapshot of ${cfg.DOMAIN_LABEL || 'public targets'}; paid change detection, intel reports, batch scans and landscape reports. Paid calls settle USDC on Base via x402 (P2P, 0% commission). One access key works across the whole change-intelligence family. Free CLI quota, Hobby $9/mo and higher plans.`;
    return {
        name,
        description: longDesc,
        image: `${base}/favicon.png`,
        x402Support: true,
        payment: {
            scheme: 'exact', network: 'eip155:8453', asset: cfg.USDC_BASE,
            payTo: cfg.PAY_TO, facilitator: cfg.FACILITATOR,
            pricing: {
                changes: cfg.PRICE_CHANGES_USD, intel: cfg.PRICE_INTEL_USD,
                batchPerTarget: cfg.PRICE_PER_TARGET_USD, landscape: cfg.PRICE_LANDSCAPE_USD,
            },
        },
        services: [
            { name: 'MCP', endpoint: `${base}/mcp`, version: '2025-06-18', description: `${name} — Streamable HTTP MCP with free and x402-paid tools.` },
            { name: 'API', endpoint: `${base}/v1/cli`, description: 'CLI/agent endpoint: free anonymous quota, then x402 per call.' },
            { name: 'x402', endpoint: `${base}/.well-known/x402`, description: 'Machine-readable payment requirements.' },
            { name: 'web', endpoint: `${base}/`, description: 'Human docs, pricing, dashboard, demos.' },
            { name: 'pricing', endpoint: `${base}/pricing`, description: 'Hobby $9, Pro $99, Business $499, Enterprise $2000 per month.' },
        ],
    };
}

const b64 = (o) => btoa(JSON.stringify(o));
const b64decode = (s) => JSON.parse(atob(s));

function newAccessKey(prefix = 'sci_') {
    const b = new Uint8Array(24); crypto.getRandomValues(b);
    return prefix + Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

export function buildRequirements(resource, priceUsd, description, cfg) {
    const maxAmountRequired = String(Math.round(priceUsd * 1_000_000));
    return {
        x402Version: 1, network: cfg.NETWORK,
        maxAmountRequired, resource, description,
        mimeType: 'application/json',
        payTo: cfg.PAY_TO,
        maxTimeoutSeconds: 60,
        contentType: 'application/json',
        acceptedPayments: [{
            type: 'erc20', network: cfg.NETWORK, asset: cfg.USDC_BASE,
            maxAmountRequired, payTo: cfg.PAY_TO, requiredKind: ['exact']
        }],
    };
}

async function verifyAndSettle(payment, requirements, cfg) {
    try {
        const token = payment.startsWith('Bearer ') ? payment.slice(7) : payment;
        const p = b64decode(token);
        const r = await fetch(cfg.FACILITATOR + '/verify', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ x402: p, kind: 'exact', resource: requirements.resource, amount: requirements.maxAmountRequired }),
        });
        const j = await r.json();
        if (!r.ok || !j?.verifyResponse?.valid) return { ok: false, reason: 'invalid_payment' };
        const s = await fetch(cfg.FACILITATOR + '/settle', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ x402: p, kind: 'exact', resource: requirements.resource, amount: requirements.maxAmountRequired }),
        });
        const sj = await s.json();
        if (!s.ok || !sj?.settleResponse?.success) return { ok: false, reason: 'settle_failed' };
        return { ok: true, payment: p, settlement: sj.settleResponse };
    } catch { return { ok: false, reason: 'verify_error' }; }
}

async function requirePaid(request, resource, priceUsd, description, cfg) {
    const requirements = buildRequirements(resource, priceUsd, description, cfg);
    const payment = request.headers.get('PAYMENT') || request.headers.get('X-PAYMENT');
    if (!payment) return { paid: false, requirements, response: json({ x402Version: 1, error: 'payment_required', accepts: [requirements] }, 402, { 'PAYMENT-REQUIRED': b64(requirements) }) };
    const s = await verifyAndSettle(payment, requirements, cfg);
    if (!s.ok) return { paid: false, requirements, response: json({ error: s.reason }, 402) };
    return { paid: true, settlement: s.settlement };
}

const LIMITS = { hobby: 10, pro: 25, business: 150, enterprise: 100000 };

// 匿名免费 CLI 用量墙（每安装、30天滚动窗口）
const FREE_CLI_QUOTA = { changes: 20, intel: 20, batch: 3, landscape: 3 };

const PLANS = (A) => ({
    hobby: { id: 'hobby', name: 'Hobby', price: 9, days: 30, features: A.planFeatures?.hobby || ['Unlimited CLI calls', 'No attribution', 'All per-result tools'] },
    pro: { id: 'pro', name: 'Pro', price: 99, days: 30, features: A.planFeatures?.pro || [] },
    business: { id: 'business', name: 'Business', price: 499, days: 30, features: A.planFeatures?.business || [] },
    enterprise: { id: 'enterprise', name: 'Enterprise', price: 2000, days: 30, features: A.planFeatures?.enterprise || [] },
});

// ---------- KV helpers ----------
async function loadSub(kv, key) {
    if (!kv || !key) return null;
    const raw = await kv.get(`sub-${key}`); if (!raw) return null;
    const sub = JSON.parse(raw); sub.active = new Date(sub.expiresAt).getTime() > Date.now(); return sub;
}

// ---------- 匿名 CLI 用量记账（养肥了再收）----------
// 记录结构：{events:[{t,k}], wins:[字符串证据], windowStart}
async function bumpInstall(kv, installId, kind, win) {
    if (!installId) return null;
    const key = `inst-${installId}`;
    const now = Date.now();
    let rec = null;
    const raw = await kv.get(key);
    if (raw) { try { rec = JSON.parse(raw); } catch { rec = null; } }
    if (!rec || !rec.windowStart || now - rec.windowStart > 30 * 864e5) rec = { windowStart: now, events: [], wins: [] };
    rec.events = rec.events.filter(e => now - e.t < 30 * 864e5);
    const isWin = kind.startsWith('_win_');
    if (!isWin) rec.events.push({ t: now, k: kind });
    if (win || isWin) { rec.wins = rec.wins || []; if (rec.wins.length < 30) rec.wins.push(win || kind.replace(/^_win_/, '')); }
    await kv.put(key, JSON.stringify(rec), { expirationTtl: 60 * 86400 });
    const realKind = isWin ? kind.replace(/^_win_/, '') : kind;
    const used = rec.events.filter(e => e.k === realKind).length;
    return { used, wins: rec.wins };
}

// 付费门：识别 key（Hobby+）或匿名配额；否则给出引导
async function gateCli(cfg, kv, request, url, kind, win) {
    const key = url.searchParams.get('key');
    if (key) {
        const sub = await loadSub(kv, key);
        if (sub && sub.active) return { allow: true, sub };
        return { allow: false, reason: 'key_invalid' };
    }
    const install = url.searchParams.get('install') || request.headers.get('x-install-id') || '';
    if (install) {
        const quota = cfg.FREE_QUOTA?.[kind] ?? FREE_CLI_QUOTA[kind] ?? 0;
        const m = await bumpInstall(kv, install, kind, win);
        if (m && m.used <= quota) return { allow: true, used: m.used, quota, wins: m.wins };
        return { allow: false, reason: 'quota_exceeded', used: m?.used, quota, wins: m?.wins || [] };
    }
    return { allow: false, reason: 'no_identity' };
}
async function getWatch(kv, key) {
    const raw = await kv.get(`watch-${key}`);
    return raw ? JSON.parse(raw) : { targets: [], webhookUrl: '', alertEmail: '', updatedAt: null };
}
async function watchView(A, kv, key, skv) {
    const sub = await loadSub(skv || kv, key);
    if (!sub) return { error: 'invalid_key', status: 401 };
    const wl = await getWatch(kv, key);
    return {
        accessKey: key, plan: sub.plan, active: sub.active, expiresAt: sub.expiresAt,
        targetLimit: LIMITS[sub.plan] || 0, targets: wl.targets,
        webhookUrl: wl.webhookUrl || '', alertEmail: wl.alertEmail || '',
    };
}

async function dispatchAlerts(A, cfg, wl, alerts, env) {
    if (!alerts.length) return;
    if (wl.webhookUrl) for (const a of alerts) try {
        await fetch(wl.webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: A.id, ...a }) });
    } catch {}
    if (wl.alertEmail && (cfg.RESEND_API_KEY || (env && env.RESEND_API_KEY))) try {
        const total = alerts.reduce((n, a) => n + a.changes.length, 0);
        await fetch('https://api.resend.com/emails', {
            method: 'POST', headers: { authorization: 'Bearer ' + (cfg.RESEND_API_KEY || env.RESEND_API_KEY), 'content-type': 'application/json' },
            body: JSON.stringify({ from: `${A.title} <alerts@${cfg.MAIL_DOMAIN || 'example.com'}>`, to: [wl.alertEmail], subject: `🔔 ${total} change(s) · ${A.title}`, html: A.emailHtml ? A.emailHtml(alerts) : JSON.stringify(alerts) }),
        });
    } catch {}
}

// Refresh one watchlist (manual or cron). Returns alerts.
async function refreshWatchlist(A, cfg, kv, wl, only) {
    const targets = only ? wl.targets.filter(t => t.target === only) : wl.targets;
    const alerts = [];
    await Promise.all(targets.map(async entry => {
        try {
            const snap = await A.fetchSnapshot({ platform: entry.platform, handle: entry.handle });
            const prev = await kv.get(A.kvKey(snap.platform, snap.handle));
            const changes = prev ? A.diff(JSON.parse(prev).items, snap.items) : [];
            await kv.put(A.kvKey(snap.platform, snap.handle), JSON.stringify({ items: snap.items, at: Date.now() }));
            entry.lastChecked = new Date().toISOString(); entry.lastChanges = changes.slice(0, 100);
            if (changes.length) alerts.push({ target: snap.handle, platform: snap.platform, changes: changes.slice(0, 50), checkedAt: entry.lastChecked });
        } catch (e) { entry.lastChecked = new Date().toISOString(); entry.error = String(e?.message || e); }
    }));
    return alerts;
}

async function scheduledScan(A, cfg, env) {
    const kv = env[cfg.KV_BINDING]; const skv = env[cfg.SHARED_BINDING] || kv; let cursor, scanned = 0, refreshed = 0;
    do {
        const l = await kv.list({ prefix: 'watch-', cursor, limit: 100 });
        for (const it of l.keys) {
            const key = it.name.slice(6); if (!key.startsWith('sci_')) continue; scanned++;
            try {
                const sub = await loadSub(skv, key); if (!sub || !sub.active) continue;
                const wl = await getWatch(kv, key); if (!wl.targets.length) continue;
                const alerts = await refreshWatchlist(A, cfg, kv, wl);
                await kv.put(`watch-${key}`, JSON.stringify(wl));
                await dispatchAlerts(A, cfg, wl, alerts, env); refreshed++;
            } catch {}
        }
        cursor = l.cursor; if (scanned >= 500) break;
    } while (cursor);
    console.log(A.id, 'scheduled scan', scanned, refreshed);
}

export { requirePaid, newAccessKey, watchView };
export { PLANS, LIMITS };
export { loadSub, getWatch, dispatchAlerts, refreshWatchlist, scheduledScan };

// ============================================================================
// HTTP / MCP server factory
// ============================================================================
// ============================================================================
// Human direct-pay（真人直接链上付 USDC：下单 + 查单自动发 key）
// 用"唯一金额"识别（USDC转账无法附备注），Base 公共 RPC 读 Transfer 日志。
// ============================================================================
const RPC = (cfg) => cfg.RPC_URL || 'https://mainnet.base.org';

async function baseBlockNumber(cfg) {
    const r = await fetch(RPC(cfg), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }) });
    return parseInt((await r.json()).result, 16);
}

async function findDirectPayment(cfg, expectUnits, windowBlocks = 1900) {
    const head = await baseBlockNumber(cfg);
    const fromBlock = '0x' + Math.max(0, head - windowBlocks).toString(16);
    const padded = cfg.PAY_TO.slice(2).toLowerCase().padStart(64, '0');
    const topics = ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', null, '0x' + padded];
    const r = await fetch(RPC(cfg), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_getLogs', params: [{ address: cfg.USDC_BASE, fromBlock, toBlock: 'latest', topics }] }),
    });
    const j = await r.json();
    if (!Array.isArray(j.result)) return null;
    for (const log of j.result) {
        if (log.data && BigInt(log.data) === BigInt(expectUnits)) {
            const from = '0x' + (log.topics[1] || '').slice(26);
            return { tx: log.transactionHash, from, block: parseInt(log.blockNumber, 16) };
        }
    }
    return null;
}

function createDirectOrder(plan, cfg, kv) {
    const salt = crypto.getRandomValues(new Uint8Array(2));
    const extra = ((salt[0] << 8 | salt[1]) % 900 + 100); // 100..999
    const amountUsd = +(plan.price + extra / 1_000_000).toFixed(6);
    const orderId = newAccessKey('ord_');
    const order = { orderId, plan: plan.id, planName: plan.name, amountUsd, amountUnits: String(Math.round(amountUsd * 1_000_000)), payTo: cfg.PAY_TO, network: cfg.NETWORK, asset: cfg.USDC_BASE, status: 'awaiting', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 90 * 60e3).toISOString() };
    return kv.put(`order-${orderId}`, JSON.stringify(order), { expirationTtl: 5400 }).then(() => order);
}

async function checkDirectOrder(order, cfg, kv, A, skv) {
    if (order.status === 'paid') return order;
    if (new Date(order.expiresAt).getTime() < Date.now()) { order.status = 'expired'; await kv.put(`order-${order.orderId}`, JSON.stringify(order)); return order; }
    const found = await findDirectPayment(cfg, order.amountUnits);
    if (!found) return order;
    order.status = 'paid'; order.tx = found.tx; order.payer = found.from; order.paidAt = new Date().toISOString();
    const now = Date.now();
    const plan = PLANS(A)[order.plan];
    const expiresAt = new Date(now + plan.days * 86400e3).toISOString();
    const accessKey = newAccessKey();
    order.accessKey = accessKey;
    await (skv || kv).put(`sub-${accessKey}`, JSON.stringify({ accessKey, plan: plan.id, payer: found.from || '', startedAt: new Date(now).toISOString(), expiresAt, priceUsd: plan.price, source: 'direct', orderId: order.orderId }));
    await kv.put(`order-${order.orderId}`, JSON.stringify(order));
    return order;
}

async function readJson(request) { try { return await request.json(); } catch { return {}; } }
const html = (s) => new Response(s, { headers: { 'content-type': 'text/html; charset=utf-8' } });

export function createServer(A, cfg) {
    const Plans = PLANS(A);

    async function handleSubscribe(url, request, kv, skv) {
        const plan = Plans[url.searchParams.get('plan')];
        if (!plan) return json({ error: 'invalid_plan', plans: Object.keys(Plans) }, 400);
        const origin = url.origin;
        const resource = `${origin}/v1/subscribe?plan=${plan.id}`;
        const pay = await requirePaid(request, resource, plan.price, `${A.title} ${plan.name} subscription`, cfg);
        if (!pay.paid) return pay.response;
        const now = Date.now();
        const expiresAt = new Date(now + plan.days * 86400e3).toISOString();
        const accessKey = newAccessKey();
        await (skv || kv).put(`sub-${accessKey}`, JSON.stringify({ accessKey, plan: plan.id, payer: pay.settlement.payer || '', startedAt: new Date(now).toISOString(), expiresAt, priceUsd: plan.price }));
        return json({ ok: true, accessKey, plan: plan.id, expiresAt });
    }

    async function watchAdd(url, request, kv, skv) {
        const key = url.searchParams.get('key');
        const sub = await loadSub(skv || kv, key);
        if (!sub) return json({ error: 'invalid_key' }, 401);
        if (!sub.active) return json({ error: 'subscription_expired' }, 402);
        const body = await readJson(request);
        const parsed = A.parseTarget(body.target);
        if (!parsed) return json({ error: 'invalid_target' }, 400);
        const wl = await getWatch(kv, key);
        if (wl.targets.length >= (LIMITS[sub.plan] || 0)) return json({ error: 'plan_limit' }, 400);
        if (wl.targets.some(t => t.target === parsed.handle && t.platform === parsed.platform)) return json({ error: 'already_added' }, 400);
        wl.targets.push({ target: parsed.handle, platform: parsed.platform, addedAt: new Date().toISOString(), lastChecked: null, lastChanges: [] });
        await kv.put(`watch-${key}`, JSON.stringify(wl));
        return json(await watchView(A, kv, key, skv));
    }
    async function watchRemove(url, request, kv, skv) {
        const key = url.searchParams.get('key');
        if (!(await loadSub(skv || kv, key))) return json({ error: 'invalid_key' }, 401);
        const body = await readJson(request);
        const wl = await getWatch(kv, key);
        wl.targets = wl.targets.filter(t => t.target !== A.safeHandle(body.target));
        await kv.put(`watch-${key}`, JSON.stringify(wl));
        return json(await watchView(A, kv, key, skv));
    }
    async function watchSettings(url, request, kv, skv) {
        const key = url.searchParams.get('key');
        if (!(await loadSub(skv || kv, key))) return json({ error: 'invalid_key' }, 401);
        const body = await readJson(request);
        const webhookUrl = (body.webhookUrl || '').trim().slice(0, 500);
        const alertEmail = (body.alertEmail || '').trim().slice(0, 200);
        if (webhookUrl && !/^https:\/\//.test(webhookUrl)) return json({ error: 'webhook_https' }, 400);
        if (alertEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) return json({ error: 'invalid_email' }, 400);
        const wl = await getWatch(kv, key);
        wl.webhookUrl = webhookUrl; wl.alertEmail = alertEmail;
        await kv.put(`watch-${key}`, JSON.stringify(wl));
        return json(await watchView(A, kv, key, skv));
    }
    async function watchRefresh(url, request, kv, skv) {
        const key = url.searchParams.get('key');
        const sub = await loadSub(skv || kv, key);
        if (!sub) return json({ error: 'invalid_key' }, 401);
        if (!sub.active) return json({ error: 'subscription_expired' }, 402);
        const wl = await getWatch(kv, key);
        const only = url.searchParams.get('target');
        const alerts = await refreshWatchlist(A, cfg, kv, wl, only);
        await kv.put(`watch-${key}`, JSON.stringify(wl));
        await dispatchAlerts(A, cfg, wl, alerts, env);
        return json(await watchView(A, kv, key, skv));
    }

    // ---- MCP ----
    async function handleMcp(request, kv) {
        let msg; try { msg = await request.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, 400); }
        const { id } = msg;
        const ok = (result) => json({ jsonrpc: '2.0', id, result });
        const err = (code, message) => json({ jsonrpc: '2.0', id, error: { code, message } });
        const text = (t, isError, extra) => json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: t }] }, ...(isError ? { isError: true } : {}) }, 200, extra || {});
        if (msg.method === 'initialize') return ok({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: A.id, version: A.version } });
        if (msg.method === 'notifications/initialized') return new Response(null, { status: 202 });
        if (msg.method === 'tools/list') return ok({ tools: A.mcpTools });
        if (msg.method === 'tools/call') {
            const a = msg.params?.arguments || {};
            const def = A.mcpTools.find(t => t.name === msg.params?.name);
            if (!def) return err(-32601, 'unknown tool');
            const price = def.price(a);
            const resource = request.url;
            if (price > 0) {
                const pay = await requirePaid(request, resource, price, def.name, cfg);
                if (!pay.paid) {
                    const r = pay.requirements;
                    return text(JSON.stringify({ x402Version: 1, error: 'payment_required', accepts: [r] }), true, { 'PAYMENT-REQUIRED': b64(r) });
                }
            }
            try { return text(JSON.stringify(await def.run(a))); }
            catch (e) { return text(JSON.stringify({ error: String(e?.message || e) }), true); }
        }
        return err(-32601, 'method not found');
    }

    // ---------- 免费 CLI：白嫖→撞墙→$9 矮台阶 ----------
    async function handleCli(A, cfg, request, url, kv) {
        const kind = url.searchParams.get('tool');
        const toolMap = { changes: 'repo_changes', intel: 'repo_intel_report', batch: 'repo_batch_scan', landscape: 'repo_landscape' };
        const def = A.mcpTools.find(t => t.name === toolMap[kind]);
        if (!def) return json({ error: 'invalid_tool', tools: Object.keys(toolMap) }, 400);

        // 构造参数
        let args;
        if (kind === 'batch' || kind === 'landscape') {
            let body = {};
            if (request.method === 'POST') { try { body = await request.json(); } catch { body = {}; } }
            const targets = body.targets || (url.searchParams.get('targets') || '').split(',').map(s => s.trim()).filter(Boolean);
            args = { targets };
        } else {
            args = { target: url.searchParams.get('target') };
        }
        if ((kind === 'changes' || kind === 'intel') && !A.parseTarget(args.target)) return json({ error: 'invalid_target' }, 400);

        // 1) 已登录 key（Hobby+）→ 放行
        // 2) 匿名 → 配额墙；配额内放行并记账，超墙给价值证据 + $9 引导
        // 3) 带 x402 支付头 → 按次结算（AI 走这条，不受配额限）
        const payHdr = request.headers.get('X-PAYMENT') || '';
        if (!payHdr) {
            const g = await gateCli(cfg, kv, request, url, kind);
            if (!g.allow) {
                const plansUrl = '/pricing';
                return json({
                    error: g.reason,
                    upgrade: 'https://' + (cfg.HOST || url.host) + plansUrl,
                    hobby: { id: 'hobby', price: 9, perks: 'unlimited CLI, no attribution' },
                    used: g.used, quota: g.quota,
                    valueDelivered: (g.wins || []).slice(-6),
                    message: g.reason === 'quota_exceeded'
                        ? `You've used this ${g.used} times in 30 days. Hobby ($9/month) unlocks unlimited calls and removes attribution.`
                        : 'Add ?key=<accessKey> or ?install=<id>.',
                }, 402);
            }
        } else {
            const price = def.price(args);
            const pay = await requirePaid(request, request.url, price, def.name, cfg);
            if (!pay.paid) return json({ x402Version: 1, error: 'payment_required', accepts: [pay.requirements] }, 402, { 'PAYMENT-REQUIRED': b64(pay.requirements) });
        }

        let result;
        try { result = await def.run(args); }
        catch (e) {
            const msg = String(e?.message || e);
            return json({ error: 'upstream_unavailable', detail: msg, retry: 'try again shortly' }, 502);
        }
        // 匿名成功：记一条“帮你做到了什么”的价值证据，供撞墙时甩到脸上
        const installId = request.headers.get('x-install-id') || url.searchParams.get('install') || '';
        if (installId && !url.searchParams.get('key') && !payHdr) {
            const win = A.winEvidence?.(kind, args, result) || `${kind} call for ${args.target || (args.targets || []).length + ' targets'}`;
            await bumpInstall(kv, installId, '_win_' + kind, win).catch(() => {});
        }
        const attributed = !!(url.searchParams.get('key') || payHdr);
        return json({ data: result, attribution: attributed ? '' : (A.cliAttribution || `${A.title} — free via x402 · remove attribution with Hobby $9/mo`) });
    }

    async function handle(request, env) {
        const url = new URL(request.url); const p = url.pathname;
        const kv = env[cfg.KV_BINDING];
        const skv = env[cfg.SHARED_BINDING] || kv;

        if (p === '/') return html(A.renderHome());
        if (p === '/changelog') return html(A.renderChangelog(cfg.TITLE || cfg.NAME));
        if (p === '/pricing') return html(A.renderPricing(Plans));
        if (p === '/dashboard') return html(A.renderDashboard());
        if (p === '/health') return json({ ok: true });
        if (p === '/status') return html(A.renderStatus(cfg.TITLE || cfg.NAME, cfg.STATUS_TARGET || A.STATUS_TARGET || ''));
        if (p === '/favicon.png') { const { FAVICON_B64 } = await import('./brand.js'); return new Response(Uint8Array.from(atob(FAVICON_B64), c => c.charCodeAt(0)), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } }); }
        if (p === '/og.png') { const { OG_B64 } = await import('./brand.js'); return new Response(Uint8Array.from(atob(OG_B64), c => c.charCodeAt(0)), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } }); }
        if (p === '/llms.txt') return new Response(A.llmsTxt(cfg), { headers: { 'content-type': 'text/plain' } });
        if (p === '/docs') return new Response(A.docsMd(cfg), { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
        if (p === '/robots.txt') return new Response('User-agent: *\nAllow: /\n', { headers: { 'content-type': 'text/plain' } });
        if (p === '/sitemap.xml') return new Response(A.sitemapXml(cfg), { headers: { 'content-type': 'application/xml' } });
        if (p === '/.well-known/x402') return json(A.wellKnown(cfg));
        if (p === '/.well-known/agent.json') return json(buildAgentMeta(cfg, A, url.origin));
        if (p === '/.well-known/glama.json') return json({ $schema: 'https://glama.ai/mcp/schemas/connector.json', maintainers: [{ email: cfg.CONTACT_EMAIL }] });
        if (p === '/privacy') return html(A.renderLegal('Privacy Policy', cfg));
        if (p === '/terms') return html(A.renderLegal('Terms of Service', cfg));
        if (p === '/contact') return html(A.renderLegal('Contact & Abuse', cfg));

        if (p === '/mcp') return handleMcp(request, kv);
        if (p === '/v1/snapshot') {
            const t = A.parseTarget(url.searchParams.get('target')); if (!t) return json({ error: 'invalid_target' }, 400);
            return json(await A.snapshot(t));
        }
        if (p === '/v1/subscribe') return handleSubscribe(url, request, kv, skv);
        // ---- Human direct-pay（无需x402钱包）----
        if (p === '/v1/order') {
            const plan = Plans[url.searchParams.get('plan')];
            if (!plan) return json({ error: 'invalid_plan', plans: Object.keys(Plans) }, 400);
            const order = await createDirectOrder(plan, cfg, kv);
            return json(order);
        }
        if (p === '/v1/order/check') {
            const id = url.searchParams.get('id');
            const raw = id ? await kv.get(`order-${id}`) : null;
            if (!raw) return json({ error: 'order_not_found' }, 404);
            return json(await checkDirectOrder(JSON.parse(raw), cfg, kv, A, skv));
        }
        if (p === '/v1/watch') return json(await watchView(A, kv, url.searchParams.get('key'), skv));
        if (p === '/v1/cli') return handleCli(A, cfg, request, url, kv);
        if (p === '/v1/watch/add') return watchAdd(url, request, kv, skv);
        if (p === '/v1/watch/remove') return watchRemove(url, request, kv, skv);
        if (p === '/v1/watch/settings') return watchSettings(url, request, kv, skv);
        if (p === '/v1/watch/refresh') return watchRefresh(url, request, kv, skv);
        if (p === '/v1/admin/stats') {
            if ((request.headers.get('x-admin-key') || url.searchParams.get('key')) !== cfg.ADMIN_KEY) return json({ error: 'forbidden' }, 403);
            const days = parseInt(url.searchParams.get('days') || '7');
            return json({ ok: true, telemetry: await readTelemetry(kv, days) });
        }
        return json({ error: 'not_found' }, 404);
    }

    return {
        async fetch(request, env) {
            try {
                if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
                const r = await handle(request, env);
                r.headers.set('access-control-allow-origin', '*');
                r.headers.set('X-Content-Type-Options', 'nosniff');
                return r;
            } catch (e) {
                console.error(e);
                try { const kv0 = env[cfg.KV_BINDING]; await telemetry.http5xx(kv0); } catch {}
                return json({ error: 'internal_error' }, 500);
            }
        },
        async scheduled(event, env, ctx) { ctx.waitUntil(scheduledScan(A, cfg, env)); },
    };
}

