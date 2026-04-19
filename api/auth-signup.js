import { createClient } from '@supabase/supabase-js';

function validate(data) {
  const err = [];
  if (!data.full_name?.trim())       err.push('Full name is required');
  if (!data.email?.trim())           err.push('Email is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) err.push('Valid email is required');
  if (!data.password)                err.push('Password is required');
  if (data.password?.length < 8)     err.push('Password must be at least 8 characters');
  return err;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { full_name, email, password, city, source, heritage_community } = req.body || {};
  const errors = validate({ full_name, email, password });
  if (errors.length) return res.status(400).json({ errors });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    // Dev stub — no Supabase configured
    return res.status(200).json({
      stub: true,
      token: 'stub-token-dev',
      user_id: 'stub-user-id',
      full_name: full_name.trim(),
      message: 'Stub signup (Supabase not configured)',
    });
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  const { data: authData, error: authErr } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: full_name.trim(), city: city?.trim() || null, source: source || null },
    },
  });

  if (authErr) {
    const msg = authErr.message?.includes('already registered')
      ? 'An account with this email already exists. Please sign in instead.'
      : authErr.message;
    return res.status(400).json({ error: msg });
  }

  const userId = authData.user?.id;
  if (userId) {
    const sbAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    await sbAdmin.from('attendee_profiles').upsert({
      id:                 userId,
      full_name:          full_name.trim(),
      city:               city?.trim() || null,
      source:             source || null,
      heritage_community: heritage_community === true || heritage_community === 'on',
    }, { onConflict: 'id' });
  }

  return res.status(200).json({
    token:         authData.session?.access_token  || null,
    refresh_token: authData.session?.refresh_token || null,
    user_id:       userId,
    full_name:     full_name.trim(),
    email_confirm: !authData.session,
  });
}
