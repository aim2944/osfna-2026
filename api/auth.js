import { createClient } from '@supabase/supabase-js';

function getMode(req) {
  return req.query?.mode || req.body?.mode || '';
}

function requireSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

async function getProfileByUserId(userId) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !userId) return null;

  const sbAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sbAdmin
    .from('attendee_profiles')
    .select('full_name, city, source, heritage_community')
    .eq('id', userId)
    .single();

  return data || null;
}

function validateSignup(data) {
  const err = [];
  if (!data.full_name?.trim()) err.push('Full name is required');
  if (!data.email?.trim()) err.push('Email is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) err.push('Valid email is required');
  if (!data.password) err.push('Password is required');
  if ((data.password || '').length < 8) err.push('Password must be at least 8 characters');
  return err;
}

async function handleLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!requireSupabaseConfig()) {
    return res.status(200).json({
      stub: true,
      token: 'stub-token-dev',
      refresh_token: 'stub-refresh-dev',
      user_id: 'stub-user-id',
      full_name: 'Demo User',
    });
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    const msg = error.message?.includes('Invalid login')
      ? 'Incorrect email or password.'
      : error.message;
    return res.status(401).json({ error: msg });
  }

  const profile = await getProfileByUserId(data.user.id);

  return res.status(200).json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_id: data.user.id,
    full_name: profile?.full_name || data.user.user_metadata?.full_name || '',
    city: profile?.city || null,
  });
}

async function handleSignup(req, res) {
  const { full_name, email, password, city, source, heritage_community } = req.body || {};
  const errors = validateSignup({ full_name, email, password });
  if (errors.length) return res.status(400).json({ errors });

  if (!requireSupabaseConfig()) {
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
  if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sbAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    await sbAdmin.from('attendee_profiles').upsert({
      id: userId,
      full_name: full_name.trim(),
      city: city?.trim() || null,
      source: source || null,
      heritage_community: heritage_community === true || heritage_community === 'on',
    }, { onConflict: 'id' });
  }

  return res.status(200).json({
    token: authData.session?.access_token || null,
    refresh_token: authData.session?.refresh_token || null,
    user_id: userId,
    full_name: full_name.trim(),
    email_confirm: !authData.session,
  });
}

async function handleMe(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No token provided' });

  if (token === 'stub-token-dev') {
    return res.status(200).json({ user_id: 'stub', email: 'demo@example.com', full_name: 'Demo User', city: null });
  }

  if (!requireSupabaseConfig()) {
    return res.status(503).json({ error: 'Auth not configured' });
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  const profile = await getProfileByUserId(user.id);

  return res.status(200).json({
    user_id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    city: profile?.city || null,
    source: profile?.source || null,
    heritage_community: profile?.heritage_community || false,
  });
}

export default async function handler(req, res) {
  const mode = getMode(req);

  if (req.method === 'POST' && mode === 'login') return handleLogin(req, res);
  if (req.method === 'POST' && mode === 'signup') return handleSignup(req, res);
  if (req.method === 'GET' && mode === 'me') return handleMe(req, res);

  return res.status(405).json({ error: 'Method not allowed' });
}
