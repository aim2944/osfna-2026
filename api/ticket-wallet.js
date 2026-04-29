import { createClient } from '@supabase/supabase-js';

const STUB_TICKETS = new Map([
  ['ABC12345', { ticket_type: 'vip', status: 'paid', quantity: 1, night: 'jul29', holder_name: 'Dani Tesso' }],
  ['DEF67890', { ticket_type: 'table', status: 'paid', quantity: 1, night: 'jul29', table_id: 'P1', holder_name: 'Bekele Giro' }],
  ['GHI11223', { ticket_type: 'bundle', status: 'paid', quantity: 1, night: 'all-access', holder_name: 'Amina Wako' }],
]);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const id = req.query.ticket_id?.trim()?.toUpperCase();
  if (!id) return res.status(400).json({ error: 'ticket_id is required' });

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await sb
      .from('party_tickets')
      .select('ticket_id, ticket_type, quantity, night, table_id, status, holder_name')
      .eq('ticket_id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Ticket not found' });

    return res.status(200).json({
      id: data.ticket_id,
      ticket_type: data.ticket_type,
      quantity: data.quantity || 1,
      night: data.ticket_type === 'bundle' ? 'all-access' : (data.night || null),
      table_id: data.table_id || null,
      status: data.status || 'pending_payment',
      holder_name: data.holder_name || null,
    });
  }

  const stub = STUB_TICKETS.get(id);
  if (!stub) return res.status(404).json({ error: 'Ticket not found' });

  return res.status(200).json({
    id,
    ticket_type: stub.ticket_type,
    quantity: stub.quantity || 1,
    night: stub.night,
    table_id: stub.table_id || null,
    status: stub.status,
    holder_name: stub.holder_name || null,
  });
}
