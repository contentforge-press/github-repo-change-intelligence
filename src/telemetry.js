// Zero-dependency operational telemetry. Counts errors, 5xx and settlement
// failures in product KV (rolling daily buckets), no third-party, no PII.
const DAY = 86400;
const key = (d) => `__telemetry__:${d}`;
const today = () => new Date().toISOString().slice(0, 10);

async function bump(kv, field, n = 1) {
    if (!kv) return;
    const k = key(today());
    try {
        const raw = await kv.get(k);
        const o = raw ? JSON.parse(raw) : { requests: 0, errors: 0, http5xx: 0, settleFail: 0, byRoute: {} };
        o[field] = (o[field] || 0) + n;
        o.byRoute[field] = o.byRoute[field] || {};
        await kv.put(k, JSON.stringify(o), { expirationTtl: 31 * DAY });
    } catch {}
}

export const telemetry = {
    error: (kv) => bump(kv, 'errors'),
    http5xx: (kv) => bump(kv, 'http5xx'),
    settleFail: (kv) => bump(kv, 'settleFail'),
    request: (kv) => bump(kv, 'requests'),
};

// Read the last `days` buckets. Called from admin route.
export async function readTelemetry(kv, days = 7) {
    if (!kv) return { error: 'no_kv' };
    const out = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - i * DAY * 1000).toISOString().slice(0, 10);
        const raw = await kv.get(key(d));
        if (raw) out.push({ date: d, ...JSON.parse(raw) });
    }
    return out;
}
