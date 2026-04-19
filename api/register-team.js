import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const DIVISION_FEES = {
  'Division A — Elite':        { amount: 75000, label: 'Division A — Elite ($750)' },
  'Division B — Competitive':  { amount: 50000, label: 'Division B — Competitive ($500)' },
  'Division C — Recreational': { amount: 35000, label: 'Division C — Recreational ($350)' },
  basketball:                  { amount: 30000, label: 'Basketball Open Division ($300)' },
};

function validate(data, sport) {
  const err = [];
  if (!data.team_name?.trim())    err.push('Team name is required');
  if (!data.team_city?.trim())    err.push('City/State is required');
  if (!data.jersey_color?.trim()) err.push('Jersey color is required');
  if (!data.roster_count)         err.push('Roster size is required');

  if (sport === 'soccer') {
    if (!data.division)             err.push('Division is required');
    if (!data.coach_name?.trim())   err.push('Coach name is required');
    if (!data.coach_email?.trim())  err.push('Coach email is required');
    if (!data.coach_phone?.trim())  err.push('Coach phone is required');
    if (!DIVISION_FEES[data.division]) err.push('Invalid division selection');
  } else {
    if (!data.captain_name?.trim())  err.push('Captain name is required');
    if (!data.captain_email?.trim()) err.push('Captain email is required');
    if (!data.captain_phone?.trim()) err.push('Captain phone is required');
  }

  if (!data.heritage_confirmed) err.push('Oromo heritage confirmation is required per OSFNA bylaws');
  if (!data.agree)              err.push('Terms agreement is required');
  return err;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body;
  const sport  = data.sport === 'basketball' ? 'basketball' : 'soccer';
  const feeKey = sport === 'basketball' ? 'basketball' : data.division;
  const fee    = DIVISION_FEES[feeKey];

  const errors = validate(data, sport);
  if (errors.length) return res.status(400).json({ errors });
  if (!fee)          return res.status(400).json({ errors: ['Invalid sport/division combination'] });

  const contactEmail = (data.coach_email || data.captain_email || '').trim();
  const contactName  = (data.coach_name  || data.captain_name  || '').trim();
  const contactPhone = (data.coach_phone || data.captain_phone || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbErr } = await sb.from('team_registrations').insert({
      sport,
      team_name:         data.team_name.trim(),
      city:              data.team_city.trim(),
      club_affiliation:  data.club_affiliation?.trim() || null,
      division:          data.division || 'Open',
      contact_name:      contactName,
      contact_email:     contactEmail,
      contact_phone:     contactPhone,
      roster_count:      data.roster_count,
      jersey_color:      data.jersey_color.trim(),
      heritage_confirmed: true,
      returning:         data.returning === 'on',
      notes:             data.notes?.trim() || null,
      status:            'pending_payment',
      fee_cents:         fee.amount,
    });
    if (dbErr) console.error('[register-team] Supabase error:', dbErr.message);
  }

  if (process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
    const origin = req.headers.origin || 'https://osfna-2026.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: contactEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name:        `OSFNA 2026 — ${sport === 'basketball' ? 'Basketball' : 'Soccer'} Team Registration`,
            description: `${data.team_name} · ${data.team_city} · ${fee.label}`,
          },
          unit_amount: fee.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/register.html?success=team&team=${encodeURIComponent(data.team_name)}`,
      cancel_url:  `${origin}/register.html#${sport}`,
      metadata: {
        sport,
        team_name:     data.team_name,
        contact_email: contactEmail,
        division:      data.division || 'Open',
      },
    });

    return res.status(200).json({ checkoutUrl: session.url });
  }

  return res.status(200).json({
    success:  true,
    fallback: true,
    message:  `Registration received for ${data.team_name}. Payment details (${fee.label}) will be emailed to ${contactEmail} within 24 hours.`,
  });
}
