import { createClient } from '@supabase/supabase-js';

const STUB = {
  stats: {
    soccer_teams:      12,
    basketball_teams:   6,
    volunteers:        47,
    vendors:           18,
    sponsors:           4,
    attendees:        841,
    passport_signups:  73,
    cities_represented: 14,
    revenue_cents: 1125000,
  },
  passport_sources: [
    { source: 'Instagram',   count: 28 },
    { source: 'TikTok',      count: 19 },
    { source: 'Friend',      count: 14 },
    { source: 'Soccer Team', count: 8  },
    { source: 'Other',       count: 4  },
  ],
  teams: [
    { id: 1, sport: 'soccer',      team_name: 'Minnesota Oromos',   city: 'Minneapolis, MN', division: 'Division A — Elite',        contact_name: 'Dani Tesso',   contact_email: 'dani@example.com', roster_count: '18–22 players', heritage_confirmed: true, returning: true,  status: 'paid',             fee_cents: 75000, submitted_at: '2026-03-10T14:22:00Z' },
    { id: 2, sport: 'soccer',      team_name: 'Dallas FC Oromo',    city: 'Dallas, TX',      division: 'Division B — Competitive',   contact_name: 'Bekele Giro',  contact_email: 'bek@example.com',  roster_count: '15–18 players', heritage_confirmed: true, returning: false, status: 'paid',             fee_cents: 50000, submitted_at: '2026-03-11T09:15:00Z' },
    { id: 3, sport: 'soccer',      team_name: 'Atlanta United Oro', city: 'Atlanta, GA',     division: 'Division A — Elite',         contact_name: 'Yonas Alemu',  contact_email: 'yo@example.com',   roster_count: '19–22 players', heritage_confirmed: true, returning: true,  status: 'pending_payment',  fee_cents: 75000, submitted_at: '2026-03-12T16:40:00Z' },
    { id: 4, sport: 'soccer',      team_name: 'Denver Oromo SC',    city: 'Denver, CO',      division: 'Division C — Recreational',  contact_name: 'Girma Feyisa', contact_email: 'gir@example.com',  roster_count: '15–18 players', heritage_confirmed: true, returning: false, status: 'flagged',          fee_cents: 35000, submitted_at: '2026-03-14T11:05:00Z' },
    { id: 5, sport: 'basketball',  team_name: 'Twin Cities Ballers',city: 'St. Paul, MN',    division: 'Open',                       contact_name: 'Abdi Kedir',   contact_email: 'abdi@example.com', roster_count: '10 players',    heritage_confirmed: true, returning: false, status: 'paid',             fee_cents: 30000, submitted_at: '2026-03-15T08:30:00Z' },
    { id: 6, sport: 'basketball',  team_name: 'Columbus Oromia',    city: 'Columbus, OH',    division: 'Open',                       contact_name: 'Lemi Boru',    contact_email: 'lem@example.com',  roster_count: '8 players',     heritage_confirmed: true, returning: true,  status: 'pending_payment',  fee_cents: 30000, submitted_at: '2026-03-16T13:20:00Z' },
  ],
  vendors: [
    { id: 1, business_name: "Mama Fatuma's Kitchen", business_type: 'Food & Beverage',     contact_name: 'Fatuma Ali',    email: 'fat@ex.com', booth_size: '10x20', status: 'paid',            fee_cents: 70000, submitted_at: '2026-03-08T10:00:00Z' },
    { id: 2, business_name: 'Oromo Threads',          business_type: 'Clothing & Apparel',  contact_name: 'Hawi Duba',     email: 'haw@ex.com', booth_size: '10x10', status: 'paid',            fee_cents: 40000, submitted_at: '2026-03-09T12:30:00Z' },
    { id: 3, business_name: 'Horn Health Services',   business_type: 'Health & Beauty',     contact_name: 'Dr. Jiru Gelm', email: 'doc@ex.com', booth_size: '10x10', status: 'pending_payment', fee_cents: 40000, submitted_at: '2026-03-10T15:00:00Z' },
    { id: 4, business_name: 'East Africa Remit',      business_type: 'Financial Services',  contact_name: 'Omar Wako',     email: 'om@ex.com',  booth_size: '10x20', status: 'paid',            fee_cents: 70000, submitted_at: '2026-03-11T09:00:00Z' },
    { id: 5, business_name: 'Bekele Art House',       business_type: 'Cultural Goods & Art',contact_name: 'Tsige Beka',    email: 'tsi@ex.com', booth_size: '10x10', status: 'pending_review',  fee_cents:     0, submitted_at: '2026-03-13T14:20:00Z' },
    { id: 6, business_name: 'Community First CU',     business_type: 'Financial Services',  contact_name: 'Lola Musa',     email: 'lol@ex.com', booth_size: 'custom',status: 'pending_review',  fee_cents:     0, submitted_at: '2026-03-14T11:45:00Z' },
  ],
  volunteers: [
    { id: 1, first_name: 'Amina',    last_name: 'Wako',     email: 'amina@ex.com',  phone: '612-555-0100', preferred_role: 'Tournament Operations',                     days_available: 'Full week', age_group: '21–30', status: 'confirmed' },
    { id: 2, first_name: 'Tolesa',   last_name: 'Hirpa',    email: 'tol@ex.com',    phone: '469-555-0101', preferred_role: 'Registration Desk',                         days_available: 'Weekend only', age_group: '16–20', status: 'confirmed' },
    { id: 3, first_name: 'Saba',     last_name: 'Gudeta',   email: 'saba@ex.com',   phone: '503-555-0102', preferred_role: 'Translation / Interpretation (Afaan Oromo)', days_available: 'Full week', age_group: '31–45', status: 'confirmed' },
    { id: 4, first_name: 'Ibsa',     last_name: 'Chemeda',  email: 'ibsa@ex.com',   phone: '314-555-0103', preferred_role: 'Media & Photography',                        days_available: 'Specific days', age_group: '21–30', status: 'pending' },
    { id: 5, first_name: 'Roba',     last_name: 'Negesso',  email: 'rob@ex.com',    phone: '651-555-0104', preferred_role: 'Cultural Events',                            days_available: 'Full week', age_group: '21–30', status: 'confirmed' },
    { id: 6, first_name: 'Chaltu',   last_name: 'Feyissa',  email: 'cha@ex.com',    phone: '770-555-0105', preferred_role: 'Hospitality',                                days_available: 'Full week', age_group: '21–30', status: 'confirmed' },
    { id: 7, first_name: 'Dassalegn',last_name: 'Boru',     email: 'das@ex.com',    phone: '720-555-0106', preferred_role: 'Setup & Teardown Crew',                      days_available: 'Weekdays only', age_group: '31–45', status: 'pending' },
  ],
  transactions: [
    { id: 1, type: 'team',   description: 'Minnesota Oromos — Division A',    amount_cents: 75000, status: 'completed', created_at: '2026-03-10T14:25:00Z' },
    { id: 2, type: 'team',   description: 'Dallas FC Oromo — Division B',      amount_cents: 50000, status: 'completed', created_at: '2026-03-11T09:18:00Z' },
    { id: 3, type: 'vendor', description: "Mama Fatuma's Kitchen — 10×20",     amount_cents: 70000, status: 'completed', created_at: '2026-03-08T10:04:00Z' },
    { id: 4, type: 'vendor', description: 'Oromo Threads — 10×10',             amount_cents: 40000, status: 'completed', created_at: '2026-03-09T12:35:00Z' },
    { id: 5, type: 'team',   description: 'Twin Cities Ballers — Basketball',  amount_cents: 30000, status: 'completed', created_at: '2026-03-15T08:33:00Z' },
    { id: 6, type: 'vendor', description: 'East Africa Remit — 10×20',         amount_cents: 70000, status: 'completed', created_at: '2026-03-11T09:05:00Z' },
    { id: 7, type: 'team',   description: 'Atlanta United Oro — Division A',   amount_cents: 75000, status: 'pending',   created_at: '2026-03-12T16:42:00Z' },
    { id: 8, type: 'vendor', description: 'Horn Health Services — 10×10',      amount_cents: 40000, status: 'pending',   created_at: '2026-03-10T15:03:00Z' },
  ],
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(200).json({ ...STUB, source: 'stub' });
  }

  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const [
      { data: teams },
      { data: vendors },
      { data: volunteers },
      { data: attendees },
    ] = await Promise.all([
      sb.from('team_registrations').select('*').order('submitted_at', { ascending: false }),
      sb.from('vendor_registrations').select('*').order('submitted_at', { ascending: false }),
      sb.from('volunteer_registrations').select('*').order('submitted_at', { ascending: false }),
      sb.from('attendee_profiles').select('city, source'),
    ]);

    const allTeams     = teams     || [];
    const allVendors   = vendors   || [];
    const allVols      = volunteers || [];
    const allAttendees = attendees || [];

    const paidTeams   = allTeams.filter(t => t.status === 'paid');
    const paidVendors = allVendors.filter(v => v.status === 'paid');

    const citiesSet = new Set(allAttendees.map(a => a.city).filter(Boolean));
    const sourceMap = {};
    allAttendees.forEach(a => { if (a.source) sourceMap[a.source] = (sourceMap[a.source] || 0) + 1; });
    const passportSources = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const revenue = [
      ...paidTeams.map(t => t.fee_cents || 0),
      ...paidVendors.map(v => v.fee_cents || 0),
    ].reduce((a, b) => a + b, 0);

    const stats = {
      soccer_teams:       allTeams.filter(t => t.sport === 'soccer').length,
      basketball_teams:   allTeams.filter(t => t.sport === 'basketball').length,
      volunteers:         allVols.length,
      vendors:            allVendors.length,
      sponsors:           0,
      attendees:          0,
      passport_signups:   allAttendees.length,
      cities_represented: citiesSet.size,
      revenue_cents:      revenue,
    };

    const transactions = [
      ...paidTeams.map(t => ({
        id: `t-${t.id}`, type: 'team',
        description: `${t.team_name} — ${t.division}`,
        amount_cents: t.fee_cents || 0,
        status: 'completed', created_at: t.paid_at || t.submitted_at,
      })),
      ...paidVendors.map(v => ({
        id: `v-${v.id}`, type: 'vendor',
        description: `${v.business_name} — ${v.booth_size}`,
        amount_cents: v.fee_cents || 0,
        status: 'completed', created_at: v.paid_at || v.submitted_at,
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      stats, teams: allTeams, vendors: allVendors, volunteers: allVols,
      transactions, passport_sources: passportSources, source: 'live',
    });
  } catch (err) {
    console.error('[dashboard-data] error:', err.message);
    return res.status(200).json({ ...STUB, source: 'stub-fallback' });
  }
}
