# GitHub Repo Change Intelligence

AI-native monitoring for public GitHub repositories — releases, stars, issues and push activity. Sold as an MCP server with pay-per-result (x402 USDC on Base) and monthly subscriptions.

## Five result tiers
| Tool | Price | What it returns |
|---|---|---|
| `github_snapshot` | free | Current metrics for one repository |
| `github_changes` | $0.05 | New releases, stars, issues, pushes since last fetch |
| `github_intel_report` | $0.50 | Summarized report with trajectory & key activity |
| `github_batch_scan` | $0.03 / repo | Up to 50 repositories |
| `github_landscape` | $5 | Rank up to 10 repos by stars + growth |

## Subscriptions
Pro $99/mo (25 repos) · Business $499/mo (15) · Enterprise $2000/mo (unlimited).

## Service
https://github-intel.contentforge-press.workers.dev

- `GET /llms.txt` · `GET /sitemap.xml` · `GET /.well-known/mcp.json`
- MCP endpoint: `/mcp` (Streamable HTTP)

Data sourced from the public GitHub REST API. You are responsible for complying with GitHub's terms.

## License
MIT
