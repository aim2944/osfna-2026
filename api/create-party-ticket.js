import crypto from "crypto";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  buildCheckoutBranding,
  buildPaymentIntentBranding,
} from "./_stripe-branding.js";
import { bookHotel } from "./_book-hotel.js";

// Party-ticket checkout. Kept behind OSFNA_TICKETS_OPEN so it stays dormant until
// prices/codes are provisioned. On open: validates input, applies a promo code,
// writes a pending party_tickets row (with promo_code attribution), and returns a
// Stripe Checkout URL. The webhook flips the row to paid; the wallet/scan use the
// signed ticket_id (see _ticket-token.js).

// Prices in cents (see PRICING.md). GA presale is priced per NIGHT: concert
// nights (opening + closing) are $10, every other party night is $5. VIP/table/
// bundle are flat. Prices are computed server-side so the client can't underpay.
const PRICES = {
  vip: 8500,
  table: 40000,
  bundle: 9900,
};

// Nights billed at the higher $10 concert presale price.
const CONCERT_NIGHTS = new Set(["thu-galmee-seena", "sat-closing"]);
const GA_CONCERT_CENTS = 1000; // $10
const GA_STANDARD_CENTS = 500; // $5

// Resolve the server-side price (cents) + human tier label for a request.
function priceFor(ticket_type, night) {
  if (ticket_type === "ga") {
    const concert = CONCERT_NIGHTS.has(night);
    return {
      cents: concert ? GA_CONCERT_CENTS : GA_STANDARD_CENTS,
      label: concert ? "Concert Presale" : "Presale",
    };
  }
  return { cents: PRICES[ticket_type], label: "Standard" };
}

const NIGHTS = new Set([
  "tue-oromummaa",
  "wed-faana-nagaa",
  "thu-galmee-seena",
  "thu-late-night",
  "fri-adaa-night",
  "fri-rooftop",
  "sat-closing",
  "sat-afterparty",
  "thu-opening",
  "thu-hookah",
  "fri-nightclub",
  "fri-hookah",
  "all-access",
]);

const TYPE_LABEL = {
  ga: "General Entry",
  vip: "VIP / Section",
  table: "Table for 6",
  bundle: "All-Access Week Pass",
};

function newTicketId() {
  // 8-char uppercase alphanumeric, matches existing ticket_id format.
  return crypto
    .randomBytes(6)
    .toString("base64")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 8)
    .padEnd(8, "0");
}

function validateEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // Hotel-block checkout shares this entrypoint (Hobby function-cap workaround).
  const body = req.body || {};
  if (body.booking_type === "hotel_block" || body.hotel_id) {
    return bookHotel(req, res);
  }

  if (process.env.OSFNA_TICKETS_OPEN !== "true") {
    return res.status(410).json({
      error:
        "Online ticket sales are not open yet. Join the OSFNA GC for the drop.",
    });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Checkout not configured" });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Never sell a ticket we can't persist — the QR wallet + gate need the row.
    return res.status(503).json({ error: "Ticketing database not configured" });
  }

  const b = req.body || {};
  const ticket_type = String(b.ticket_type || "").toLowerCase();
  const isBundle = ticket_type === "bundle";
  const night = isBundle ? "all-access" : String(b.night || "");
  const quantity = Math.max(1, Math.min(10, parseInt(b.quantity, 10) || 1));
  const holder_name = String(b.holder_name || "")
    .trim()
    .slice(0, 120);
  const holder_email = String(b.holder_email || "")
    .trim()
    .toLowerCase();
  const promoInput = String(b.promo_code || "")
    .trim()
    .toUpperCase();

  // ── Validate ──
  const VALID_TYPES = new Set(["ga", "vip", "table", "bundle"]);
  const errors = [];
  if (!VALID_TYPES.has(ticket_type)) errors.push("Invalid ticket type");
  if (!isBundle && !NIGHTS.has(night)) errors.push("Invalid night");
  if (!holder_name) errors.push("Name is required");
  if (!validateEmail(holder_email)) errors.push("Valid email is required");
  if (errors.length) return res.status(400).json({ errors });

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // ── Price (computed server-side, not trusted from the client) ──
  const { cents: unit_cents, label: tierLabel } = priceFor(ticket_type, night);
  let subtotal = unit_cents * quantity;

  // ── Promo code (optional) ──
  let promo_code = null;
  if (promoInput) {
    const { data: promo } = await sb
      .from("promo_codes")
      .select("code, discount_type, discount_value, active")
      .eq("code", promoInput)
      .single();
    if (promo && promo.active) {
      promo_code = promo.code;
      if (promo.discount_type === "percent" && promo.discount_value > 0) {
        subtotal = Math.round(
          subtotal * (1 - Math.min(100, promo.discount_value) / 100),
        );
      } else if (
        promo.discount_type === "fixed_cents" &&
        promo.discount_value > 0
      ) {
        subtotal = Math.max(0, subtotal - promo.discount_value);
      }
    }
  }

  // ── Create pending ticket row ──
  const ticket_id = newTicketId();
  const { error: dbErr } = await sb.from("party_tickets").insert({
    ticket_id,
    ticket_type,
    quantity,
    unit_cents,
    total_cents: subtotal,
    price_tier: tierLabel,
    night,
    table_id:
      ticket_type === "table"
        ? String(b.table_id || "").slice(0, 12) || null
        : null,
    holder_name,
    holder_email,
    promo_code,
    status: "pending_payment",
  });
  if (dbErr) {
    console.error("[create-party-ticket] insert error:", dbErr.message);
    return res
      .status(500)
      .json({ error: "Could not reserve ticket — try again" });
  }

  // ── Stripe checkout ──
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin =
    req.headers.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://osfna-2026.vercel.app";
  const label = `OSFNA 2026 — ${TYPE_LABEL[ticket_type]}${isBundle ? "" : ` · ${night}`}`;

  const session = await stripe.checkout.sessions.create({
    ...buildCheckoutBranding({
      submitMessage: "Official OSFNA 2026 party ticket checkout.",
    }),
    payment_method_types: ["card"],
    customer_email: holder_email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: label,
            description: `${quantity} × ${TYPE_LABEL[ticket_type]}${promo_code ? ` (promo ${promo_code})` : ""}`,
          },
          // Charge the (possibly discounted) per-unit amount; quantity carried by Stripe.
          unit_amount: Math.round(subtotal / quantity),
        },
        quantity,
      },
    ],
    mode: "payment",
    payment_intent_data: buildPaymentIntentBranding({
      description: `OSFNA 2026 ${TYPE_LABEL[ticket_type]} — ${ticket_id}`,
      statementSuffix: "OSFNA PARTY",
    }),
    success_url: `${origin}/ticket.html?ref=${encodeURIComponent(ticket_id)}`,
    cancel_url: `${origin}/parties.html`,
    metadata: {
      ticket_id,
      ticket_type,
      night,
      quantity: String(quantity),
      promo_code: promo_code || "",
      holder_name,
      holder_email,
    },
  });

  return res.status(200).json({ checkoutUrl: session.url, ticket_id });
}
