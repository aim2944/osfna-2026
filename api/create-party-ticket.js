import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Revenue split constants (stored in metadata for transparency)
const SPLIT = { venue: 0.60, treasury: 0.25, platform: 0.10, board_stipend: 0.05 };

const TICKET_LABELS = {
  ga:     'General Admission',
  vip:    'VIP Express Pass',
  bundle: 'All-Access Oromo Week Pass',
  table:  'VIP Table Reservation',
};

const MAX_QUANTITIES = { ga: 10, vip: 6, bundle: 4, table: 1 };

function validate(data) {
  const err = [];
  const { ticket_type, quantity, unit_cents } = data;

  if (!TICKET_LABELS[ticket_type])         err.push('Invalid ticket type');
  if (!Number.isInteger(quantity) || quantity < 1) err.push('Quantity must be at least 1');
  if (quantity > (MAX_QUANTITIES[ticket_type] || 10)) err.push(`Max ${MAX_QUANTITIES[ticket_type]} per order for ${ticket_type}`);
  if (!unit_cents || unit_cents < 1000)    err.push('Invalid price — must be at least $10');
  if (unit_cents > 1000000)                err.push('Price exceeds maximum — contact organizers');
  if (ticket_type === 'table' && !data.table_id) err.push('Table selection required');

  return err;
}

function buildSplitMeta(totalCents) {
  return {
    split_venue:        String(Math.round(totalCents * SPLIT.venue)),
    split_treasury:     String(Math.round(totalCents * SPLIT.treasury)),
    split_platform:     String(Math.round(totalCents * SPLIT.platform)),
    split_board_stipend:String(Math.round(totalCents * SPLIT.board_stipend)),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body;
  const errors = validate(data);
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  const { ticket_type, quantity, unit_cents, price_tier, night, table_id, table_seats } = data;
  const totalCents = unit_cents * quantity;
  const ticketId   = randomBytes(8).toString('hex').toUpperCase();
  const label      = TICKET_LABELS[ticket_type];

  // Persist to Supabase before checkout to get a record ID
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    await sb.from('party_tickets').insert({
      ticket_id:    ticketId,
      ticket_type,
      quantity,
      unit_cents,
      total_cents:  totalCents,
      price_tier:   price_tier || null,
      night:        night || null,
      table_id:     table_id || null,
      table_seats:  table_seats ? parseInt(table_seats, 10) : null,
      status:       'pending_payment',
      split_venue:        Math.round(totalCents * SPLIT.venue),
      split_treasury:     Math.round(totalCents * SPLIT.treasury),
      split_platform:     Math.round(totalCents * SPLIT.platform),
      split_board_stipend:Math.round(totalCents * SPLIT.board_stipend),
    });
  }

  if (process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
    const origin = req.headers.origin || 'https://osfna-2026.vercel.app';

    const nightLabel = night
      ? { jul25:'Jul 25', jul26:'Jul 26', jul27:'Jul 27', jul28:'Jul 28', jul29:'Jul 29', jul31:'Jul 31', aug01:'Aug 1' }[night] || night
      : null;

    const description = [
      ticket_type === 'table' ? `Table ${table_id} (seats ${table_seats || '?'})` : null,
      nightLabel ? `Night: ${nightLabel}` : null,
      price_tier ? `${price_tier} pricing` : null,
    ].filter(Boolean).join(' · ');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name:        `OSFNA 2026 — ${label}`,
            description: description || 'Oromo Week 2026 · July 25 – Aug 1',
            images: [],
          },
          unit_amount: unit_cents,
        },
        quantity,
      }],
      mode: 'payment',
      success_url: `${origin}/parties.html?success=1&ref=${ticketId}`,
      cancel_url:  `${origin}/parties.html`,
      metadata: {
        ticket_id:   ticketId,
        ticket_type,
        quantity:    String(quantity),
        night:       night || '',
        table_id:    table_id || '',
        price_tier:  price_tier || '',
        ...buildSplitMeta(totalCents),
      },
    });

    return res.status(200).json({ checkoutUrl: session.url, ticket_id: ticketId });
  }

  // Fallback — no Stripe
  return res.status(200).json({
    success:   true,
    fallback:  true,
    ticket_id: ticketId,
    message:   `${label} request received (${quantity}x ${(unit_cents/100).toFixed(0)} each). Payment details will be emailed within 24 hours. Reference: ${ticketId}`,
  });
}
