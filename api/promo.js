import { createClient } from "@supabase/supabase-js";
import { rejectIfNotAdmin } from "./_admin-auth.js";

// GET /api/promo?code=TETTEY            → public: validate a code (no PII)
// GET /api/promo?mode=leaderboard       → admin: sales attributed per promoter
//
// Attribution is written to party_tickets.promo_code at checkout; this endpoint
// only reads. Falls back to a friendly stub when Supabase isn't configured.

function sb() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return null;
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function validateCode(req, res) {
  const code = (req.query.code || "").trim().toUpperCase();
  if (!code)
    return res.status(400).json({ valid: false, error: "code required" });

  const db = sb();
  if (!db)
    return res
      .status(200)
      .json({
        valid: true,
        code,
        discount_type: "none",
        discount_value: 0,
        stub: true,
      });

  const { data, error } = await db
    .from("promo_codes")
    .select("code, promoter_name, discount_type, discount_value, active")
    .eq("code", code)
    .single();

  if (error || !data || !data.active) {
    return res.status(200).json({ valid: false, code });
  }
  return res.status(200).json({
    valid: true,
    code: data.code,
    promoter_name: data.promoter_name || null,
    discount_type: data.discount_type || "none",
    discount_value: data.discount_value || 0,
  });
}

async function leaderboard(req, res) {
  if (rejectIfNotAdmin(req, res)) return;

  const db = sb();
  if (!db) return res.status(200).json({ leaderboard: [], stub: true });

  const [{ data: codes }, { data: tickets }] = await Promise.all([
    db.from("promo_codes").select("*").order("created_at", { ascending: true }),
    db
      .from("party_tickets")
      .select("promo_code, quantity, total_cents, status"),
  ]);

  const agg = {};
  (codes || []).forEach((c) => {
    agg[c.code] = {
      code: c.code,
      promoter_name: c.promoter_name,
      promoter_username: c.promoter_username,
      role: c.role,
      commission_pct: c.commission_pct ?? 15,
      tickets: 0,
      paid_tickets: 0,
      gross_cents: 0,
      commission_cents: 0,
    };
  });

  (tickets || []).forEach((t) => {
    const code = (t.promo_code || "").toUpperCase();
    if (!code || !agg[code]) return;
    const qty = Number(t.quantity || 0);
    agg[code].tickets += qty;
    if (t.status === "paid" || t.status === "completed") {
      const cents = Number(t.total_cents || 0);
      agg[code].paid_tickets += qty;
      agg[code].gross_cents += cents;
      agg[code].commission_cents += Math.round(
        cents * (agg[code].commission_pct / 100),
      );
    }
  });

  const rows = Object.values(agg).sort((a, b) => b.gross_cents - a.gross_cents);
  const totals = rows.reduce(
    (acc, r) => ({
      paid_tickets: acc.paid_tickets + r.paid_tickets,
      gross_cents: acc.gross_cents + r.gross_cents,
      commission_cents: acc.commission_cents + r.commission_cents,
    }),
    { paid_tickets: 0, gross_cents: 0, commission_cents: 0 },
  );

  return res.status(200).json({ leaderboard: rows, totals });
}

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");

  if ((req.query.mode || "") === "leaderboard") return leaderboard(req, res);
  return validateCode(req, res);
}
