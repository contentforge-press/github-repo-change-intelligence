import { createServer } from './kernel.js';
import { adapter } from './adapter.js';

const cfg = {
    NETWORK: 'base', CHAIN_ID: 8453,
    PAY_TO: '0x4873108b2280b7f3EF8cD70cEca3aaBD385f8D6C',
    USDC_BASE: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    FACILITATOR: 'https://x402.org/facilitator',
    PRICE_CHANGES_USD: 0.05, PRICE_INTEL_USD: 0.50,
    PRICE_PER_TARGET_USD: 0.03, BATCH_MAX: 50,
    PRICE_LANDSCAPE_USD: 5, LANDSCAPE_MAX: 10,
    KV_BINDING: 'INTEL_KV',
    SHARED_BINDING: 'SHARED_KV',
    HOST: 'github-intel.contentforge-press.workers.dev',
    CONTACT_EMAIL: 'contentforge.press@outlook.com',
    ADMIN_KEY: 'ba951afdb936eecd4ffb9ddfb1b44b25f47bbab1dfc391ac',
    MAIL_DOMAIN: 'mail.contentforge.press',
    // RESEND_API_KEY injected as Worker secret when available
};

export default createServer(adapter, cfg);
