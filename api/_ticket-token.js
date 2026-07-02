import crypto from "crypto";

// QR tokens are `TICKET_ID.SIG` where SIG = base64url(HMAC-SHA256(ticket_id)).
// This makes ticket QR codes unforgeable: a guessed/incremented ticket_id has no
// valid signature, so the gate scanner rejects it before any DB lookup.
// Requires env TICKET_HMAC_SECRET (any long random string).

function b64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sig(ticketId) {
  const secret = process.env.TICKET_HMAC_SECRET;
  if (!secret) return null;
  return b64url(
    crypto
      .createHmac("sha256", secret)
      .update(String(ticketId).toUpperCase())
      .digest(),
  );
}

// Build the signed QR value for a ticket id. Falls back to the bare id if no
// secret is configured (dev/stub only) so local testing still renders a QR.
export function signTicket(ticketId) {
  const id = String(ticketId || "")
    .trim()
    .toUpperCase();
  if (!id) return "";
  const s = sig(id);
  return s ? `${id}.${s}` : id;
}

// Verify a scanned QR value. Returns the ticket id if the signature checks out,
// else null. If no secret is configured, accepts a bare id (dev/stub only).
export function verifyTicket(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;

  if (!process.env.TICKET_HMAC_SECRET) {
    // Dev/stub mode: no secret, accept bare id (no dot).
    return raw.includes(".") ? null : raw.toUpperCase();
  }

  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot).toUpperCase();
  const provided = raw.slice(dot + 1);
  const expected = sig(id);
  if (!expected) return null;

  const pb = Buffer.from(provided);
  const eb = Buffer.from(expected);
  if (pb.length !== eb.length) return null;
  return crypto.timingSafeEqual(pb, eb) ? id : null;
}
