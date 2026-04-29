import { createClient } from '@supabase/supabase-js';

// Stub ticket database for fallback (when Supabase not configured)
const STUB_TICKETS = new Map([
  ['ABC12345', { ticket_type: 'vip', status: 'paid', holder_name: 'Dani Tesso', night: 'jul29', scanned: false }],
  ['DEF67890', { ticket_type: 'table', status: 'paid', holder_name: 'Bekele Giro', night: 'jul29', table_id: 'P1', scanned: false }],
  ['GHI11223', { ticket_type: 'bundle', status: 'paid', holder_name: 'Amina Wako', night: null, scanned: false }],
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticket_id, scanner_id, night } = req.body || {};

  if (!ticket_id?.trim()) return res.status(400).json({ valid: false, reason: 'No ticket ID provided' });

  const id = ticket_id.trim().toUpperCase();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: ticket, error } = await sb
      .from('party_tickets')
      .select('*')
      .eq('ticket_id', id)
      .single();

    if (error || !ticket) {
      return res.status(200).json({ valid: false, reason: 'Ticket not found', ticket_id: id });
    }

    if (ticket.status !== 'paid') {
      return res.status(200).json({ valid: false, reason: `Ticket status: ${ticket.status}`, ticket_id: id });
    }

    // Bundle tickets are valid any night — skip night check
    if (ticket.ticket_type !== 'bundle' && night && ticket.night && ticket.night !== night) {
      return res.status(200).json({
        valid: false,
        reason: `Ticket is for ${ticket.night}, not ${night}`,
        ticket_id: id,
      });
    }

    // Check for duplicate scan
    const { data: scans } = await sb
      .from('ticket_scans')
      .select('id, scanned_at')
      .eq('ticket_id', id)
      .eq('night', night || ticket.night)
      .limit(1);

    if (scans?.length > 0) {
      return res.status(200).json({
        valid:   false,
        reason:  `Already scanned at ${new Date(scans[0].scanned_at).toLocaleTimeString()}`,
        ticket_id: id,
        duplicate: true,
      });
    }

    // Log the scan
    await sb.from('ticket_scans').insert({
      ticket_id:  id,
      ticket_type: ticket.ticket_type,
      night:      night || ticket.night || 'unknown',
      scanner_id: scanner_id || 'unknown',
      scanned_at: new Date().toISOString(),
    });

    return res.status(200).json({
      valid:       true,
      ticket_type: ticket.ticket_type,
      night:       ticket.night || 'all-access',
      holder_name: ticket.holder_name || null,
      table_id:    ticket.table_id || null,
      quantity:    ticket.quantity,
    });
  }

  // Stub fallback
  const stub = STUB_TICKETS.get(id);
  if (!stub) return res.status(200).json({ valid: false, reason: 'Ticket not found', ticket_id: id });
  if (stub.status !== 'paid') return res.status(200).json({ valid: false, reason: 'Not paid', ticket_id: id });
  if (stub.scanned) return res.status(200).json({ valid: false, reason: 'Already scanned', ticket_id: id, duplicate: true });

  stub.scanned = true;
  return res.status(200).json({
    valid:       true,
    ticket_type: stub.ticket_type,
    night:       stub.night || 'all-access',
    holder_name: stub.holder_name,
    table_id:    stub.table_id || null,
  });
}
