/**
 * Vercel Serverless Function — Update Match Score (Admin Only)
 *
 * TODO: Wire up Supabase and authentication when credentials are provided
 *
 * This function will:
 * 1. Accept POST request with match ID, scores, and admin auth token
 * 2. Verify admin authentication
 * 3. Update match score in Supabase
 * 4. Recalculate bracket advancement (who advances to next round)
 * 5. Return updated bracket state
 *
 * Environment variables needed:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - ADMIN_API_KEY (for authentication)
 */

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: Implement admin authentication check
  // TODO: Validate match exists and sport/division
  // TODO: Update score in Supabase
  // TODO: Recalculate bracket advancement logic
  // TODO: Return updated bracket

  return res.status(501).json({
    error: 'Score update API coming soon',
    message: 'Admin score entry will be available once tournament begins.',
    note: 'Contact myosfna@gmail.com for manual score updates during OSFNA 2026'
  });
}
