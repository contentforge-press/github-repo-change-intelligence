// GitHub Repo Change Intelligence —— 适配器（GitHub 平台）
// 监控公开 GitHub 仓库的：release、star/issue 数、最近推送/提交活动。
import { renderHome, renderPricing, renderDashboard, renderLegal, renderStatus, renderChangelog } from './pages.js';

const ID = 'github-intel';
const TITLE = 'GitHub Repo Change Intelligence';
const VERSION = '1.0.0';

// ---- 安全 ----
const BLOCKED_SUB = ['localhost', '127.', '0.0.', '10.', '192.', '169.', '::1', '.internal', 'metadata', 'example.com'];
function safeHandle(h) {
    if (typeof h !== 'string') return '';
    const s = h.trim().toLowerCase();
    if (s.length > 100 || /[^a-z0-9_\-./]/.test(s)) return '';
    if (BLOCKED_SUB.some(b => s.includes(b))) return '';
    return s;
}
// 目标：owner/repo（如 facebook/react），允许前后空白
function parseTarget(input) {
    const s = safeHandle(input); if (!s) return null;
    const m = s.match(/^([a-z0-9](?:[a-z0-9\-]{0,38}))\/([a-z0-9_.\-]{1,100})$/);
    if (!m) return null;
    return { platform: 'github', handle: `${m[1]}/${m[2]}` };
}

// ---- 取数 ----
async function getJson(u) {
    const tok = globalThis.__GH_TOKEN || '';
    const headers = { 'user-agent': 'intel-kernel/1.0', 'accept': 'application/vnd.github+json' };
    if (tok) headers.authorization = `Bearer ${tok}`;
    const r = await fetch(u, { headers });
    if (!r.ok) throw new Error('upstream_' + r.status);
    return r.json();
}

async function fetchRepo(handle) {
    const d = await getJson(`https://api.github.com/repos/${handle}`);
    if (!d || d.message === 'Not Found') throw new Error('repo_not_found');
    return d;
}

// 归一化一条 release
function normRelease(x) {
    return {
        releaseId: String(x.id),
        tag: x.tag_name || '',
        name: x.name || x.tag_name || '',
        draft: !!x.draft,
        prerelease: !!x.prerelease,
        publishedAt: x.published_at || x.created_at || '',
    };
}

async function fetchSnapshot({ handle }) {
    const repo = await fetchRepo(handle);
    let releases = [];
    try {
        const rel = await getJson(`https://api.github.com/repos/${handle}/releases?per_page=20`);
        if (Array.isArray(rel)) releases = rel.filter(x => !x.draft).map(normRelease);
    } catch (e) { releases = []; }
    const meta = {
        fullName: repo.full_name,
        description: repo.description || '',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        pushedAt: repo.pushed_at,
        defaultBranch: repo.default_branch,
        archived: !!repo.archived,
        homepage: repo.homepage || '',
        language: repo.language || '',
    };
    return { platform: 'github', handle, meta, items: releases };
}

// ---- 差异 ----
function diff(prev, curr) {
    const out = [];
    const byTag = new Map(prev.map(x => [x.tag, x]));
    const curTags = new Set(curr.map(x => x.tag));
    for (const c of curr) {
        const old = byTag.get(c.tag);
        if (!old) {
            out.push({ changeType: c.prerelease ? 'new_prerelease' : 'new_release', tag: c.tag, name: c.name, publishedAt: c.publishedAt });
        }
    }
    for (const p of prev) if (!curTags.has(p.tag)) out.push({ changeType: 'release_removed', tag: p.tag, name: p.name });
    return out;
}

// ---- 汇总 ----
function buildReport(meta, items, changes) {
    const newRel = changes.filter(c => c.changeType === 'new_release').length;
    const latest = items[0] || null;
    return {
        repo: meta.fullName, description: meta.description,
        stars: meta.stars, forks: meta.forks, openIssues: meta.openIssues,
        language: meta.language, pushedAt: meta.pushedAt, archived: meta.archived,
        latestRelease: latest ? { tag: latest.tag, publishedAt: latest.publishedAt } : null,
        newReleases: newRel,
        takeaways: [
            newRel > 0 ? `🚀 ${newRel} new release(s); latest ${latest ? latest.tag : ''}` : 'No new published release in latest sample',
            `${meta.stars} stars · ${meta.forks} forks · ${meta.openIssues} open issues`,
            meta.archived ? '⚠️ Repository is archived (no longer maintained)' : `Last push ${meta.pushedAt}`,
        ],
    };
}

function kvKey(platform, handle) { return `snap-${platform}-${handle.replace('/', '__')}`; }

export const adapter = {
    id: ID, title: TITLE, version: VERSION,
    safeHandle, parseTarget, fetchSnapshot, diff, kvKey,
    async snapshot(t) {
        const s = await fetchSnapshot(t);
        return { platform: s.platform, target: s.handle, repo: s.meta.fullName, stars: s.meta.stars, openIssues: s.meta.openIssues, pushedAt: s.meta.pushedAt, latestReleases: s.items.slice(0, 5).map(x => ({ tag: x.tag, publishedAt: x.publishedAt })) };
    },
    planFeatures: {
        pro: ['Track up to 25 repositories', 'New release & prerelease alerts', 'Activity & archive watch', 'All paid MCP tools', 'Email + webhook'],
        business: ['Track up to 150 repositories', '10 team seats', 'Higher API limits', 'Repo activity reports', 'Priority support'],
        enterprise: ['Unlimited repos & seats', 'Custom signals & private feeds', 'SLA & onboarding', 'SSO & advanced controls', 'Dedicated reports'],
    },
    mcpTools: [
        { name: 'repo_snapshot', description: 'FREE. Current state of a public GitHub repository: stars, forks, open issues, primary language, last push and latest releases. Use for "what is repo X", GitHub project research, open-source due diligence, library/framework health, checking if a project is maintained.',
          inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] },
          price: () => 0, run: async (a) => (await adapter.snapshot(parseTarget(a.target))) },
        { name: 'repo_changes', description: 'PAID ($0.05 USDC on Base via x402). Release change detection vs history: new releases, new prereleases, removed releases. Use for "did library X ship a new version", release monitoring, dependency update alerts, tracking when a project publishes/tagges.',
          inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] },
          price: () => 0.05, run: async (a) => adapter._changes(a.target) },
        { name: 'repo_intel_report', description: 'PAID ($0.50 USDC on Base via x402). Highest-value repository-intelligence report: project health, popularity (stars/forks), maintenance signals, latest release and executive takeaways. Use for open-source risk assessment, choosing libraries/SDKs, vendor/technology due diligence, competitive developer research.',
          inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] },
          price: () => 0.50, run: async (a) => adapter._report(a.target) },
        { name: 'repo_batch_scan', description: 'PAID ($0.03 USDC per repo via x402, max 50). Track a whole dependency/portfolio set of GitHub repositories in one call: stars, issues, last push and latest release per repo. Use for dependency monitoring, open-source portfolio health, supply-chain maintenance tracking, scanning many projects.',
          inputSchema: { type: 'object', properties: { targets: { type: 'array', items: { type: 'string' } } }, required: ['targets'] },
          price: (a) => (a.targets || []).slice(0, 50).length * 0.03, run: async (a) => adapter._batch(a.targets) },
        { name: 'repo_landscape', description: 'PAID ($5 USDC on Base via x402, up to 10 repos). Strategic repository landscape: ranks related projects by stars and activity, flags abandoned/archived or low-maintenance outliers. Use for comparing libraries/frameworks, picking the best open-source option, technology benchmarking, developer-tool market mapping.',
          inputSchema: { type: 'object', properties: { targets: { type: 'array', items: { type: 'string' } } }, required: ['targets'] },
          price: () => 5, run: async (a) => adapter._landscape(a.targets) },
    ],
    async _changes(targetStr) {
        const t = parseTarget(targetStr); const s = await fetchSnapshot(t);
        return { target: s.handle, repo: s.meta.fullName, note: 'first_snapshot_baseline', latestReleases: s.items.slice(0, 10) };
    },
    winEvidence(kind, args, result) {
        const d = result?.data ?? result;
        if (kind === 'changes') return `Checked releases for ${args.target}: latest ${d.latestReleases?.[0]?.tag || 'n/a'}`;
        if (kind === 'intel') return `Health report for ${args.target}`;
        if (kind === 'batch') return `Scanned ${d.scanned ?? (args.targets || []).length} repos`;
        if (kind === 'landscape') return `Landscape across ${(args.targets || []).length} repos`;
        return `${kind} call`;
    },
    async _report(targetStr) {
        const t = parseTarget(targetStr); const s = await fetchSnapshot(t);
        return buildReport(s.meta, s.items, []);
    },
    async _batch(targets) {
        const list = Array.isArray(targets) ? targets.slice(0, 50) : [];
        const out = [];
        await Promise.all(list.map(async (raw) => {
            const t = parseTarget(raw); if (!t) return;
            try {
                const s = await fetchSnapshot(t);
                out.push({ target: s.handle, repo: s.meta.fullName, stars: s.meta.stars, openIssues: s.meta.openIssues, pushedAt: s.meta.pushedAt, archived: s.meta.archived, latestTag: s.items[0] ? s.items[0].tag : null });
            } catch (e) { out.push({ target: raw, error: String(e?.message || e) }); }
        }));
        return { scanned: out.length, repos: out };
    },
    async _landscape(targets) {
        const list = Array.isArray(targets) ? targets.slice(0, 10) : [];
        const b = await adapter._batch(list);
        const ranked = b.repos.filter(x => !x.error).sort((x, y) => (y.stars || 0) - (x.stars || 0));
        return {
            compared: ranked.length,
            ranking: ranked.map((x, i) => ({ rank: i + 1, repo: x.repo, stars: x.stars, openIssues: x.openIssues, latestTag: x.latestTag, archived: x.archived })),
            takeaways: ranked.length ? [
                `Most starred: ${ranked[0].repo} (${ranked[0].stars})`,
                ranked.filter(x => x.archived).map(x => `⚠️ ${x.repo} is archived`).join('; ') || 'No project in the set is archived',
                ranked[ranked.length - 1] ? `Smallest community: ${ranked[ranked.length - 1].repo} (${ranked[ranked.length - 1].stars})` : '',
            ].filter(Boolean) : [],
        };
    },
    llmsTxt: (c) => `# ${TITLE}\n\n> Track public GitHub repositories: new releases, activity and maintenance signals. Free snapshot; paid intel in USDC via x402 on Base.\n\n- MCP: https://${c.HOST}/mcp\n- Free: https://${c.HOST}/v1/snapshot?target=facebook/react\n- Docs: https://${c.HOST}/docs\n\n## When to use\n- An agent needs to know if a dependency just shipped a new release or became unmaintained.\n- A team wants maintenance/health signals (stars, issues, last push) across many repos.\n\n## Tools\n- repo_snapshot: free\n- repo_changes: $0.05 — new/removed releases & prereleases since last check\n- repo_intel_report: $0.50 — maintenance & project-health report\n- repo_batch_scan: $0.03 per repo (up to 50)\n- repo_landscape: $5 (up to 10 repos)\n\n## Example asks\n- "Did facebook/react release a new version?"\n- "Is owner/repo still actively maintained?"\n- "Rank these repos by stars and flag archived ones."\n\nTarget syntax: owner/repo. Paid calls settle USDC on Base with x402, or pay directly (no AI wallet required).\n`,
    docsMd: (c) => `# ${TITLE} — Documentation\n\nA paid change-intelligence API for public GitHub repositories, designed to be called by AI agents and automation.\n\n## Endpoints\n| Endpoint | Price | Returns |\n|---|---|---|\n| GET /v1/snapshot?target=owner/repo | free | stars, forks, issues, latest release, last push |\n| repo_changes | $0.05 | new/removed releases & prereleases vs history |\n| repo_intel_report | $0.50 | maintenance & health report with takeaways |\n| repo_batch_scan | $0.03/repo | up to 50 repos in one call |\n| repo_landscape | $5 | ranking across up to 10 repos, archived flags |\n\n## Target format\n\`owner/repo\`, for example \`facebook/react\`.\n\n## Payment\n- Agents: unpaid calls return HTTP 402 with a base64 PAYMENT-REQUIRED header; settle USDC on Base via x402 and retry. P2P, 0% commission.\n- Humans: choose a plan on /pricing, send the exact USDC amount shown, and the access key is issued automatically — no card or AI wallet needed.\n- One access key works across the whole change-intelligence product family.\n\n## Subscriptions\nPro $99/month (25 repos), Business $499/month (150), Enterprise $2000/month (unlimited). Continuous watch and change alerts.\n\nMCP endpoint (Streamable HTTP): https://${c.HOST}/mcp\n`,
    sitemapXml: (c) => `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${c.HOST}/</loc></url><url><loc>https://${c.HOST}/pricing</loc></url><url><loc>https://${c.HOST}/docs</loc></url><url><loc>https://${c.HOST}/dashboard</loc></url></urlset>`,
    wellKnown: (c) => ({
        x402Version: 1, network: c.NETWORK, chainId: c.CHAIN_ID, asset: c.USDC_BASE, payTo: c.PAY_TO, facilitator: c.FACILITATOR,
        pricing: { changes: c.PRICE_CHANGES_USD, intel: c.PRICE_INTEL_USD, batchPerRepo: c.PRICE_PER_TARGET_USD, landscape: c.PRICE_LANDSCAPE_USD },
    }),

    STATUS_TARGET: 'facebook/react',
    renderStatus, renderChangelog, renderHome, renderPricing, renderDashboard, renderLegal,
};
