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
GA presale is priced **per night**: concert nights are $10, every other party night
is $5. Prices are computed server-side in `api/create-party-ticket.js`
(`priceFor` / `CONCERT_NIGHTS`), not from the client, so nobody can underpay.

| Tier | ticket_type | Price | Notes |
|---|---|---|---|
| General Entry — party night | `ga` | **$5** | Wed Faana Nagaa, Thu Late Night, Fri Adaa, Fri Rooftop, Fri Late Night, Sat Late Night |
| General Entry — concert night | `ga` | **$10** | Thu "Galmee Seena" opening concert, Sat closing concert (`thu-galmee-seena`, `sat-closing`) |
| VIP / Section / Bottle | `vip` | $85 | flat |
| Table for 6 | `table` | $400 | flat |
| All-Access Week Pass | `bundle` | $99 | flat |

To change a night's price, edit `GA_STANDARD_CENTS` / `GA_CONCERT_CENTS` (or
`CONCERT_NIGHTS`) in `api/create-party-ticket.js`, and update the matching `$X` label
on the buy buttons (`data-price` + button text) in `index.html` and `parties.html`.

`OSFNA_TICKETS_OPEN=true` gates whether online sales are open at all (set live
2026-07-10). GA checkout is wired to the homepage events cards (`index.html`) and to
all 8 paid nights on `parties.html`; Tuesday "Oromummaa" stays free (GC link only).

**Why these numbers:** a $5 impulse presale is near-frictionless for the standard
nights, while the two concert nights ($10) carry the headline talent and can bear the
premium. VIP at ~3× the $30 door norm. The **All-Access bundle** locks the buyer in
before a competing promoter can.

**Revenue model:** base case ≈ 600 paid/night × 3 paid nights × ~$24 net (after ~15%
promoter commission + Stripe fees) ≈ **$43k**, plus ~$12k vendor booths. See
`OSFNA_BRAIN.md` §2 for bear/base/bull.

## Splits (already modeled in dashboard `renderParties`)
Venue 60% · Treasury 25% · Platform 10% · Board stipend 5% — adjust per signed
rev-share venue deal. Promoter commission (default 15%) comes off the top before splits.
