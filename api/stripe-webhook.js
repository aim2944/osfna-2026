import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const raw = await getRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true, skipped: true });
  }

  const session = event.data.object;
  const { sport, team_name, business_name } = session.metadata || {};

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(200).json({ received: true, db: 'not configured' });
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (team_name) {
    const { error } = await sb
      .from('team_registrations')
      .update({ status: 'paid', stripe_session_id: session.id, paid_at: new Date().toISOString() })
      .eq('team_name', team_name)
      .eq('status', 'pending_payment');
    if (error) console.error('[stripe-webhook] team update error:', error.message);
  } else if (business_name) {
    const { error } = await sb
      .from('vendor_registrations')
      .update({ status: 'paid', stripe_session_id: session.id, paid_at: new Date().toISOString() })
      .eq('business_name', business_name)
      .eq('status', 'pending_payment');
    if (error) console.error('[stripe-webhook] vendor update error:', error.message);
  } else if (session.metadata?.ticket_id) {
    const { error } = await sb
      .from('party_tickets')
      .update({
        status: 'paid',
        stripe_session_id: session.id,
        paid_at: new Date().toISOString(),
        holder_name: session.metadata?.holder_name || null,
        holder_email: session.metadata?.holder_email || null,
      })
      .eq('ticket_id', session.metadata.ticket_id)
      .eq('status', 'pending_payment');
    if (error) console.error('[stripe-webhook] party ticket update error:', error.message);
  }

  return res.status(200).json({ received: true });
}
