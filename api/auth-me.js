import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No token provided' });

  if (token === 'stub-token-dev') {
    return res.status(200).json({ user_id: 'stub', email: 'demo@example.com', full_name: 'Demo User', city: null });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: 'Auth not configured' });
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error } = await sb.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  const sbAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await sbAdmin
    .from('attendee_profiles')
    .select('full_name, city, source, heritage_community')
    .eq('id', user.id)
    .single();

  return res.status(200).json({
    user_id:           user.id,
    email:             user.email,
    full_name:         profile?.full_name || user.user_metadata?.full_name || '',
    city:              profile?.city || null,
    source:            profile?.source || null,
    heritage_community:profile?.heritage_community || false,
  });
}
