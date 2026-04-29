import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const BOOTH_FEES = {
  '10x10': { amount: 40000, label: '10×10 Standard Booth ($400)' },
  '10x20': { amount: 70000, label: '10×20 Large Booth ($700)' },
  custom:  { amount: 0,     label: 'Custom Booth (pricing TBD)' },
};

async function notifyAdmin(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  const to     = process.env.NOTIFY_EMAIL;
  const from   = process.env.NOTIFY_FROM || 'OSFNA Registrations <onboarding@resend.dev>';
  if (!apiKey || !to) return;
  const lines = Object.entries(payload).map(([k, v]) => `${k}: ${v ?? ''}`).join('\n');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[OSFNA] New ${payload.type || 'vendor'} submission — ${payload.business_name || ''}`,
        text: lines,
      }),
    });
  } catch (e) {
    console.error('[register-vendor] notify email failed:', e?.message);
  }
}

function validate(data) {
  const err = [];
  if (!data.business_name?.trim())  err.push('Business name is required');
  if (!data.contact_name?.trim())   err.push('Contact name is required');
  if (!data.email?.trim())          err.push('Email is required');
  if (!data.phone?.trim())          err.push('Phone is required');
  if (!data.booth_size)             err.push('Booth size is required');
  if (!data.products_desc?.trim())  err.push('Product/service description is required');
  if (!data.agree)                  err.push('Terms agreement is required');
  return err;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body;
  const fee  = BOOTH_FEES[data.booth_size];

  const errors = validate(data);
  if (errors.length) return res.status(400).json({ errors });
  if (!fee)          return res.status(400).json({ errors: ['Invalid booth size selection'] });

  await notifyAdmin({
    type:          'vendor',
    business_name: data.business_name?.trim(),
    contact_name:  data.contact_name?.trim(),
    email:         data.email?.trim(),
    phone:         data.phone?.trim(),
    booth_size:    data.booth_size,
    submitted_at:  new Date().toISOString(),
  });

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbErr } = await sb.from('vendor_registrations').insert({
      business_name:  data.business_name.trim(),
      business_type:  data.business_type || null,
      contact_name:   data.contact_name.trim(),
      email:          data.email.trim(),
      phone:          data.phone.trim(),
      city:           data.city?.trim() || null,
      booth_size:     data.booth_size,
      power:          data.power || null,
      products_desc:  data.products_desc.trim(),
      setup_pref:     data.setup_pref || null,
      notes:          data.notes?.trim() || null,
      status:         fee.amount > 0 ? 'pending_payment' : 'pending_review',
      fee_cents:      fee.amount,
    });
    if (dbErr) console.error('[register-vendor] Supabase error:', dbErr.message);
  }

  if (process.env.STRIPE_SECRET_KEY && fee.amount > 0) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
    const origin = req.headers.origin || 'https://osfna-2026.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: data.email.trim(),
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name:        'OSFNA 2026 — Vendor Booth Permit',
            description: `${data.business_name} · ${fee.label}`,
          },
          unit_amount: fee.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/vendor.html?success=1&biz=${encodeURIComponent(data.business_name)}`,
      cancel_url:  `${origin}/vendor.html`,
      metadata: {
        business_name: data.business_name,
        booth_size:    data.booth_size,
        contact_email: data.email,
      },
    });

    return res.status(200).json({ checkoutUrl: session.url });
  }

  return res.status(200).json({
    success:  true,
    fallback: true,
    message:  `Application received for ${data.business_name}. ${
      fee.amount > 0
        ? `Payment details (${fee.label}) will be emailed within 24 hours.`
        : 'Our team will contact you within 5 business days with pricing.'
    }`,
  });
}
