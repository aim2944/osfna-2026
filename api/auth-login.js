import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
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

  // Fetch profile for full_name
  const sbAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await sbAdmin
    .from('attendee_profiles')
    .select('full_name, city')
    .eq('id', data.user.id)
    .single();

  return res.status(200).json({
    token:         data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_id:       data.user.id,
    full_name:     profile?.full_name || data.user.user_metadata?.full_name || '',
    city:          profile?.city || null,
  });
}
