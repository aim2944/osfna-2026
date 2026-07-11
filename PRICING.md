# OSFNA 2026 — Pricing (source of truth)
Set these in Stripe, then paste the Price IDs into `.env` (see `.env.example`). Run
`node scripts/setup-stripe-products.mjs` to create them all in one shot.

All prices in USD. Party tickets are the primary revenue lever — see `OSFNA_BRAIN.md` §2.

## Team / sport registration (board lane)
| Product | Price | Env var |
|---|---|---|
| Soccer Division A — Elite | $400 | `STRIPE_TEAM_PRICE_DIV_A` |
| Soccer Division B — Competitive | $400 | `STRIPE_TEAM_PRICE_DIV_B` |
| Soccer Division C — Recreational | $300 | `STRIPE_TEAM_PRICE_DIV_C` |
| Basketball (5v5/4v4) | $235 | in-code `BASKETBALL_TEAM_FEE_CENTS` (23500) |
| Golf | $250 | `STRIPE_TEAM_PRICE_GOLF` |

> Note: basketball fee is hardcoded at $235 in `register-team.js`; env price IDs for
> soccer/golf are for a future Stripe-Price-based checkout. Keep the two in sync.

## Vendor booths (your lane — high margin)
| Product | Price | Env var |
|---|---|---|
| 10×10 booth | $400 | `STRIPE_VENDOR_BOOTH_10X10` |
| 10×20 booth | $700 | `STRIPE_VENDOR_BOOTH_10X20` |
| Custom booth | negotiable | `STRIPE_VENDOR_BOOTH_CUSTOM` |

## Party tickets (your lane — THE money) — NEW
Per-night unless noted. GA runs a presale ladder to pull commitment forward, then
raises to the door price. Prices are inline in `api/create-party-ticket.js`
(`PRICES`), not Stripe Price IDs.

| Tier | ticket_type | Super-early | Early | Standard/Door |
|---|---|---|---|---|
| General Entry | `ga` | **$5** | **$10** | $30 |
| VIP / Section / Bottle | `vip` | — | — | $85 |
| Table for 6 | `table` | — | — | $400 |
| All-Access Week Pass | `bundle` | — | $80 | $99 |

**Live wave is server-controlled by `OSFNA_GA_TIER`** (Vercel prod env):
`super_early` → `early` → `standard`. Bump it to raise the GA price with **no code
deploy** — the client can never request a cheaper tier. Currently set to
`super_early` ($5). When you bump it, also update the "$5" label shown in
`parties.html` (buy buttons + checkout modal) to match.

`OSFNA_TICKETS_OPEN=true` gates whether online sales are open at all (set live
2026-07-10). GA checkout is wired to all 8 paid nights on `parties.html`; Tuesday
"Oromummaa" stays free (GC link only).

**Why these numbers:** the $5→$10→$30 ladder maximizes early social proof and cash
flow — a $5 impulse presale is near-frictionless, and every wave bump signals
scarcity. VIP at ~3× door. The **All-Access bundle is the key lever** — one $99 sale
up front beats chasing four $30 door sales, and it locks the buyer in before a
competing promoter can.

**Revenue model:** base case ≈ 600 paid/night × 3 paid nights × ~$24 net (after ~15%
promoter commission + Stripe fees) ≈ **$43k**, plus ~$12k vendor booths. See
`OSFNA_BRAIN.md` §2 for bear/base/bull.

## Splits (already modeled in dashboard `renderParties`)
Venue 60% · Treasury 25% · Platform 10% · Board stipend 5% — adjust per signed
rev-share venue deal. Promoter commission (default 15%) comes off the top before splits.
