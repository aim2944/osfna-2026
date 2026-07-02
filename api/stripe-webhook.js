import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const raw = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(
      "[stripe-webhook] Signature verification failed:",
      err.message,
    );
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true, skipped: true });
  }

  const session = event.data.object;
  const meta = session.metadata || {};
  const reg_ref = meta.reg_ref?.trim();
  const team_name = meta.team_name?.trim();
  const business_name = meta.business_name?.trim();
  const ticket_id = meta.ticket_id?.trim();
  const booking_ref = meta.booking_ref?.trim();

  // Stripe is live but the DB isn't wired — this is a real misconfiguration that
  // would silently drop a paid order. Return non-2xx so Stripe RETRIES (and the
  // failure is visible in the dashboard) instead of losing the payment.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "[stripe-webhook] Supabase not configured — cannot record paid session",
      session.id,
    );
    return res.status(500).json({ error: "DB not configured" });
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const paidFields = {
    status: "paid",
    stripe_session_id: session.id,
    paid_at: new Date().toISOString(),
  };
  let error = null;

  if (reg_ref || team_name) {
    // Prefer the unique reg_ref; fall back to trimmed team_name for older sessions.
    let q = sb
      .from("team_registrations")
      .update(paidFields)
      .eq("status", "pending_payment");
    q = reg_ref ? q.eq("reg_ref", reg_ref) : q.eq("team_name", team_name);
    ({ error } = await q);
  } else if (business_name) {
    ({ error } = await sb
      .from("vendor_registrations")
      .update(paidFields)
      .eq("business_name", business_name)
      .eq("status", "pending_payment"));
  } else if (ticket_id) {
    ({ error } = await sb
      .from("party_tickets")
      .update({
        ...paidFields,
        holder_name: meta.holder_name || null,
        holder_email: meta.holder_email || null,
      })
      .eq("ticket_id", ticket_id)
      .eq("status", "pending_payment"));
  } else if (booking_ref) {
    ({ error } = await sb
      .from("hotel_bookings")
      .update(paidFields)
      .eq("booking_ref", booking_ref)
      .eq("status", "pending_payment"));
  } else {
    console.warn(
      "[stripe-webhook] No matchable metadata on session",
      session.id,
    );
    return res.status(200).json({ received: true, matched: false });
  }

  if (error) {
    // Let Stripe retry — do NOT swallow with a 200, or the payment is lost.
    console.error("[stripe-webhook] DB update error:", error.message);
    return res.status(500).json({ error: "DB update failed" });
  }

  return res.status(200).json({ received: true });
}
