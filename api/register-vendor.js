/**
 * Vercel Serverless Function — Vendor Registration
 *
 * TODO: Wire up Stripe and Supabase when credentials are provided
 *
 * This function will:
 * 1. Accept POST request from vendor.html form
 * 2. Create a Stripe Checkout session with the selected booth size price
 * 3. On Stripe webhook success, insert vendor record into Supabase
 * 4. Return checkout URL to client
 *
 * Environment variables needed:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - STRIPE_VENDOR_BOOTH_10X10
 * - STRIPE_VENDOR_BOOTH_10X20
 * - STRIPE_VENDOR_BOOTH_CUSTOM
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
  // TODO: Validate vendor data and booth prices

  return res.status(501).json({
    error: 'Vendor registration payment coming soon',
    message: 'Please submit your vendor registration form via email. Payment processing will be enabled soon.',
    helpEmail: 'myosfna@gmail.com'
  });
}
