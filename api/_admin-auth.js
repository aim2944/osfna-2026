import crypto from "crypto";

// Shared-secret admin gate for ops endpoints (dashboard data, door scanner).
// Clients send the key in the `x-admin-key` header (or `?admin_key=` for GETs).
// This is the security boundary — the client-side access codes in dashboard.html
// are only cosmetic panel gating and must NOT be trusted for data access.

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Returns true if the request carries the correct admin key.
export function isAdmin(req) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return false; // fail closed when unconfigured
  const provided =
    req.headers["x-admin-key"] ||
    req.query?.admin_key ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

// Guard helper: call at the top of a handler. Returns true if it already
// sent a 401/503 (caller should `return`), false if the request is authorized.
export function rejectIfNotAdmin(req, res) {
  if (!process.env.ADMIN_API_KEY) {
    res.status(503).json({ error: "Admin access not configured on server" });
    return true;
  }
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return true;
  }
  return false;
}
