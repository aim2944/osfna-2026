# Hotels page + Oromo discount checkout — Jul 1 2026

- [x] Research real hotels near James Griffin Stadium (research agent — 10 real properties, 5–16 min out)
- [x] Build `hotels.html` — cream Oromo editorial system, photo cards, 30/40/50% tiers, filters, booking modal
- [x] Build `api/book-hotel.js` — Stripe Checkout, server-side pricing, env-gated `OSFNA_HOTELS_OPEN`
- [x] Persist bookings: `supabase/migration_2026-07-01_hotel_bookings.sql` + pending-row insert + `stripe-webhook.js` booking_ref branch
- [x] Add Hotels link to nav (index.html, parties.html)
- [x] Review pass (code-reviewer + security-reviewer agents) — HIGH persistence gap fixed; origin allowlist, email cap, try/catch, modal a11y, date-picker sync applied
- [x] Verify: scripts/check.sh green; screenshots of page + booking modal confirmed

## Review / results
- Payments stay DORMANT until `OSFNA_HOTELS_OPEN=true` is set in Vercel. Before flipping it:
  1. Rotate Stripe keys (KEY_ROTATION.md — still mandatory).
  2. Run `supabase/migration_2026-07-01_hotel_bookings.sql` in Supabase.
  3. Sign actual room-block/discount agreements with the hotels — the 30/40/50% rates are the *plan*, not yet negotiated. Do not take money before the blocks are real.
- Known accepted gaps (match project baseline): no rate limiting on checkout endpoints; `booked=` banner is cosmetic (not server-verified).
- Card photos are representative stock (noted in page fine print); swap in real property photos when block deals are signed.

# Hotels page — READY-TO-GO pass + expansion to 17 — Jul 3 2026 (agent team)

- [x] Readiness audit (agent): page 200, photos 200, display/API sync 10/10, check.sh green — found checkout NOT dormant (OSFNA_HOTELS_OPEN=true in prod)
- [x] Aimon decision: KEEP checkout OPEN, mint live Stripe sessions at 30/40/50
- [x] Remove Best Western Como Park — permanently CLOSED (sold to Interfaith Action, now family shelter); API map synced with Country Inn swap (30d0959)
- [x] Research agent: 8 new hotels verified operating 2026; flagged Embassy Suites downtown CLOSED (never add)
- [x] Photo agent: 7 real property photos sourced + verified (signage/address/landmark); Country Inn photo confirmed correct property
- [x] Expand to 17 hotels, display + API pricing map in sync (edf1ee3)
- [x] Hotels nav link added to schedule/itinerary/media/register/vendor (9b65ab9)
- [x] Verified live: 17 cards render, all photos 200, live cs_live checkout session minted for country-inn (HB26D78A54) and saint-paul-hotel
- [x] Bed-type options (9fcd470, deployed): per-hotel beds on cards + modal select, server-validated, in Stripe description/metadata; live-verified (valid → cs_live session, invalid → 400)
- [ ] Apply `supabase/migration_2026-07-03_hotel_bed_type.sql` in the Supabase SQL editor (adds `hotel_bookings.bed_type`; API falls back gracefully until then)

## Review / results
- Checkout is LIVE and taking real money paths.
  - Room-block agreements: SIGNED (Aimon confirmed Jul 3, rates on page correct for all 17).
  - Remaining risk: Stripe key rotation (KEY_ROTATION.md) — still mandatory, not done.
- Fine print still says "Photos are representative" — all 17 are now real; consider updating.
- Test bookings HB26D78A54 + one saint-paul ref + one "Bed Option Test" (quality-inn, Jul 3 bed-type verification) sit as unpaid pending rows in hotel_bookings; harmless, ignore in reconciliation.
