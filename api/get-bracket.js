/**
 * Vercel Serverless Function — Get Tournament Bracket
 *
 * TODO: Wire up Supabase when credentials are provided
 *
 * This function will:
 * 1. Accept GET request with sport and division parameters
 * 2. Fetch current bracket state from Supabase
 * 3. Return bracket as JSON (teams, scores, advancement status)
 *
 * Environment variables needed:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 */

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sport = 'soccer', division = 'A' } = req.query;

  // TODO: Implement Supabase query for bracket data
  // TODO: Return bracket structure with teams, scores, match results

  return res.status(501).json({
    error: 'Bracket data coming soon',
    message: 'Live bracket updates will be available once the tournament begins.',
    sport,
    division
  });
}
