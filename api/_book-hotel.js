import crypto from "crypto";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  buildCheckoutBranding,
  buildPaymentIntentBranding,
} from "./_stripe-branding.js";

// Hotel room-block checkout with the OSFNA Oromo community discount.
// Kept behind OSFNA_HOTELS_OPEN so it stays dormant until real room-block
// agreements are signed with each property and Stripe keys are rotated
// (see KEY_ROTATION.md). Pricing is authoritative HERE — the client page
// only displays; it never sends amounts.

// Standard tournament-week nightly rate in cents + negotiated Oromo discount.
// Must stay in sync with the HOTELS array in hotels.html (display only).
const HOTELS = {
  "quality-inn-midway": {
    name: "Quality Inn Midway — St. Paul",
    rate_cents: 10900,
    discount_pct: 50,
  },
  "country-inn-roseville": {
    name: "Country Inn & Suites by Radisson, Roseville",
    rate_cents: 11900,
    discount_pct: 50,
  },
  "days-hotel-university-ave": {
    name: "Days Hotel by Wyndham University Ave SE",
    rate_cents: 9900,
    discount_pct: 50,
  },
  "motel-6-roseville": {
    name: "Motel 6 Roseville — Minneapolis North",
    rate_cents: 7900,
    discount_pct: 50,
  },
  "home2-suites-roseville": {
    name: "Home2 Suites by Hilton Roseville",
    rate_cents: 14900,
    discount_pct: 40,
  },
  "courtyard-roseville": {
    name: "Courtyard Minneapolis St. Paul/Roseville",
    rate_cents: 14900,
    discount_pct: 40,
  },
  "residence-inn-roseville": {
    name: "Residence Inn Minneapolis St. Paul/Roseville",
    rate_cents: 16900,
    discount_pct: 40,
  },
  "hie-roseville": {
    name: "Holiday Inn Express Roseville–St. Paul",
    rate_cents: 13900,
    discount_pct: 40,
  },
  "fairfield-roseville": {
    name: "Fairfield Inn & Suites Roseville",
    rate_cents: 15900,
    discount_pct: 40,
  },
  "hampton-roseville": {
    name: "Hampton Inn Minneapolis/Roseville",
    rate_cents: 16500,
    discount_pct: 40,
  },
  "doubletree-east": {
    name: "DoubleTree by Hilton St. Paul East",
    rate_cents: 15500,
    discount_pct: 40,
  },
  "hyatt-place-downtown": {
    name: "Hyatt Place St. Paul / Downtown",
    rate_cents: 18500,
    discount_pct: 30,
  },
  "springhill-downtown": {
    name: "SpringHill Suites St. Paul Downtown",
    rate_cents: 19500,
    discount_pct: 30,
  },
  "drury-plaza-downtown": {
    name: "Drury Plaza Hotel St. Paul Downtown",
    rate_cents: 20900,
    discount_pct: 30,
  },
  "intercontinental-riverfront": {
    name: "InterContinental Saint Paul Riverfront",
    rate_cents: 25900,
    discount_pct: 30,
  },
  "hampton-inn-downtown-stpaul": {
    name: "Hampton Inn & Suites St. Paul Downtown",
    rate_cents: 16900,
    discount_pct: 30,
  },
  "saint-paul-hotel": {
    name: "The Saint Paul Hotel",
    rate_cents: 20900,
    discount_pct: 30,
  },
};

// Bookable window around OSFNA week (Aug 1–8, 2026).
const WINDOW_START = "2026-07-27";
const WINDOW_END = "2026-08-11"; // latest allowed check-in
const MAX_NIGHTS = 14;
const MAX_ROOMS = 5;

function newBookingRef() {
  return "HB" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function validateEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
}

function parseDay(s) {
  // Strict YYYY-MM-DD → UTC midnight, or null.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Invoked by create-party-ticket.js when the checkout request is a hotel block.
// Kept as an underscore helper (not a standalone Vercel function) to stay under
// the Hobby-plan function cap; the public route is /api/create-party-ticket.
export async function bookHotel(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (process.env.OSFNA_HOTELS_OPEN !== "true") {
    return res.status(410).json({
      error:
        "Oromo hotel-block booking hasn't opened yet. Join the OSFNA GC — rates drop there first.",
    });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Checkout not configured" });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Never take a booking we can't persist — reconciliation needs the row.
    return res.status(503).json({ error: "Booking database not configured" });
  }

  const b = req.body || {};
  const hotel_id = String(b.hotel_id || "");
  const hotel = HOTELS[hotel_id];
  const rooms = Math.max(
    1,
    Math.min(MAX_ROOMS, parseInt(String(b.rooms), 10) || 1),
  );
  const guest_name = String(b.guest_name || "")
    .trim()
    .slice(0, 120);
  const guest_email = String(b.guest_email || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
  const check_in = parseDay(b.check_in);
  const check_out = parseDay(b.check_out);

  // ── Validate ──
  const errors = [];
  if (!hotel) errors.push("Invalid hotel");
  if (!guest_name) errors.push("Name is required");
  if (!validateEmail(guest_email)) errors.push("Valid email is required");
  if (!check_in || !check_out) errors.push("Valid dates are required");
  let nights = 0;
  if (check_in && check_out) {
    nights = Math.round((check_out - check_in) / 86400000);
    if (nights < 1) errors.push("Check-out must be after check-in");
    if (nights > MAX_NIGHTS) errors.push(`Max stay is ${MAX_NIGHTS} nights`);
    if (check_in < parseDay(WINDOW_START) || check_in > parseDay(WINDOW_END))
      errors.push("Check-in must be during OSFNA week (Jul 27 – Aug 11)");
  }
  if (errors.length) return res.status(400).json({ errors });

  // ── Price (server-side only) ──
  const nightly_cents = Math.round(
    hotel.rate_cents * (1 - hotel.discount_pct / 100),
  );
  const total_cents = nightly_cents * nights * rooms;

  // ── Create pending booking row (webhook flips to paid) ──
  const booking_ref = newBookingRef();
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { error: dbErr } = await sb.from("hotel_bookings").insert({
    booking_ref,
    hotel_id,
    hotel_name: hotel.name,
    check_in: b.check_in,
    check_out: b.check_out,
    nights,
    rooms,
    nightly_cents,
    total_cents,
    discount_pct: hotel.discount_pct,
    guest_name,
    guest_email,
    status: "pending_payment",
  });
  if (dbErr) {
    console.error("[book-hotel] insert error:", dbErr.message);
    return res
      .status(500)
      .json({ error: "Could not reserve booking — try again" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // Only redirect back to origins we own — the Origin header is client-supplied.
  const ALLOWED_ORIGINS = new Set(
    ["https://osfna-2026.vercel.app", process.env.NEXT_PUBLIC_APP_URL].filter(
      Boolean,
    ),
  );
  const origin = ALLOWED_ORIGINS.has(req.headers.origin)
    ? req.headers.origin
    : process.env.NEXT_PUBLIC_APP_URL || "https://osfna-2026.vercel.app";

  const inStr = b.check_in;
  const outStr = b.check_out;
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ...buildCheckoutBranding({
        submitMessage:
          "OSFNA 2026 Oromo community hotel rate — official room block.",
      }),
      payment_method_types: ["card"],
      customer_email: guest_email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `OSFNA Oromo Rate — ${hotel.name}`,
              description: `${nights} night${nights > 1 ? "s" : ""} · ${rooms} room${rooms > 1 ? "s" : ""} · ${inStr} → ${outStr} · ${hotel.discount_pct}% community discount`,
            },
            unit_amount: nightly_cents,
          },
          quantity: nights * rooms,
        },
      ],
      mode: "payment",
      payment_intent_data: buildPaymentIntentBranding({
        description: `OSFNA 2026 hotel block ${hotel.name} — ${booking_ref}`,
        statementSuffix: "OSFNA HOTEL",
      }),
      success_url: `${origin}/hotels.html?booked=${encodeURIComponent(booking_ref)}`,
      cancel_url: `${origin}/hotels.html`,
      metadata: {
        booking_type: "hotel_block",
        booking_ref,
        hotel_id,
        hotel_name: hotel.name,
        check_in: inStr,
        check_out: outStr,
        nights: String(nights),
        rooms: String(rooms),
        discount_pct: String(hotel.discount_pct),
        guest_name,
        guest_email,
      },
    });
  } catch (err) {
    console.error("[book-hotel] stripe error:", err.message);
    return res
      .status(502)
      .json({ error: "Payment provider error — try again" });
  }

  return res.status(200).json({ checkoutUrl: session.url, booking_ref });
}
