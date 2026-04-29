import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

function getMode(req) {
  return req.query?.mode || req.body?.mode || '';
}

function isAuthorized(req) {
  const bearer = req.headers.authorization?.replace('Bearer ', '').trim();
  const headerKey = req.headers['x-admin-key'];
  const expected = process.env.PUSH_ADMIN_KEY || process.env.ADMIN_API_KEY;
  return Boolean(expected) && (bearer === expected || headerKey === expected);
}

async function resolveUserId(req) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null;
  if (token === 'stub-token-dev') return null;

  const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

async function handlePublicKey(req, res) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'VAPID public key not configured' });
  }
  return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
}

async function handleSubscribe(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Push storage is not configured' });
  }

  const { subscription, topics, user_agent } = req.body || {};
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'A valid Web Push subscription is required' });
  }

  const attendeeId = await resolveUserId(req);
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const safeTopics = Array.isArray(topics) && topics.length ? topics : ['scores', 'scarcity', 'gates'];

  const { error } = await sb.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    topics: safeTopics,
    attendee_id: attendeeId,
    user_agent: user_agent || req.headers['user-agent'] || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) {
    console.error('[push] subscribe upsert failed', error.message);
    return res.status(500).json({ error: 'Could not save the push subscription' });
  }

  return res.status(200).json({ ok: true });
}

async function handleSend(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { title, body, url, tag, topic = 'scores' } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Push storage is not configured' });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return res.status(503).json({ error: 'VAPID credentials are not configured' });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: subscriptions, error } = await sb
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, topics')
    .contains('topics', [topic]);

  if (error) {
    console.error('[push] send fetch failed', error.message);
    return res.status(500).json({ error: 'Could not load subscriptions' });
  }

  const payload = JSON.stringify({
    title,
    body,
    url: url || '/index.html',
    tag: tag || `osfna-${topic}`,
    topic,
  });

  const results = await Promise.allSettled(
    (subscriptions || []).map(async (row) => {
      try {
        await webpush.sendNotification({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        }, payload);
        return { ok: true, id: row.id };
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await sb.from('push_subscriptions').delete().eq('id', row.id);
        }
        throw error;
      }
    })
  );

  const sent = results.filter((item) => item.status === 'fulfilled').length;
  const failed = results.length - sent;
  return res.status(200).json({ ok: true, sent, failed });
}

export default async function handler(req, res) {
  const mode = getMode(req);

  if (req.method === 'GET' && mode === 'public-key') return handlePublicKey(req, res);
  if (req.method === 'POST' && mode === 'subscribe') return handleSubscribe(req, res);
  if (req.method === 'POST' && mode === 'send') return handleSend(req, res);

  return res.status(405).json({ error: 'Method not allowed' });
}
