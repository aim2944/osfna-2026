/**
 * Vercel Serverless Function — Tournament Bracket (read + admin update)
 *
 * Consolidated from get-bracket.js (GET) + update-score.js (POST) to stay under
 * the Hobby-plan serverless-function cap. Both were unwired stubs with no callers.
 *
 * TODO: Wire up Supabase when the bracket goes live.
 * Env needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_API_KEY (for POST).
 */

export default function handler(req, res) {
  if (req.method === "GET") {
    const { sport = "soccer", division = "A" } = req.query;
    // TODO: fetch bracket state from Supabase (teams, scores, advancement).
    return res.status(501).json({
      error: "Bracket data coming soon",
      message:
        "Live bracket updates will be available once the tournament begins.",
      sport,
      division,
    });
  }

  if (req.method === "POST") {
    // TODO: admin auth, validate match, update score, recompute advancement.
    return res.status(501).json({
      error: "Score update API coming soon",
      message: "Admin score entry will be available once tournament begins.",
      note: "Contact myosfna@gmail.com for manual score updates during OSFNA 2026",
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
