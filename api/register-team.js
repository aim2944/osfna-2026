/**
 * Vercel Serverless Function — Team Registration
 *
 * TODO: Wire up Stripe and Supabase when credentials are provided
 *
 * This function will:
 * 1. Accept POST request from register.html form
 * 2. Create a Stripe Checkout session with the selected sport/division price
 * 3. On Stripe webhook success, insert team record into Supabase
 * 4. Return checkout URL to client
 *
 * Environment variables needed:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - STRIPE_TEAM_PRICE_DIV_A
 * - STRIPE_TEAM_PRICE_DIV_B
 * - STRIPE_TEAM_PRICE_DIV_C
 * - STRIPE_TEAM_PRICE_BASKETBALL
 * - STRIPE_TEAM_PRICE_GOLF
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 */

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: Implement Stripe checkout session creation
  // TODO: Implement Supabase webhook handler for payment success
  // TODO: Validate team data and fees

  return res.status(501).json({
    error: 'Team registration payment coming soon',
    message: 'Please submit your team registration form via email. Payment processing will be enabled soon.',
    helpEmail: 'myosfna@gmail.com'
  });
}
