import { notifyAdmin } from './_notify.js';

const INTEREST_TYPES = new Set([
  'Full 5v5 team',
  'Building a team',
  'Individual player',
  'Organizer / sponsor lead',
]);

function validate(data) {
  const errors = [];
  if (!data.contact_name?.trim()) errors.push('Contact name is required');
  if (!data.email?.trim()) errors.push('Email is required');
  if (!data.phone?.trim()) errors.push('Phone is required');
  if (!data.interest_type) errors.push('Interest type is required');
  if (data.interest_type && !INTEREST_TYPES.has(data.interest_type)) errors.push('Invalid interest type');
  if (!data.agree) errors.push('Confirmation is required');
  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body || {};
  const errors = validate(data);
  if (errors.length) return res.status(400).json({ errors });

  const contactName = data.contact_name.trim();
  const contactEmail = data.email.trim();
  const contactPhone = data.phone.trim();
  const teamName = data.team_name?.trim() || 'Not provided';

  await notifyAdmin({
    subject: `[OSFNA] 5v5 basketball interest - ${contactName}`,
    name: contactName,
    email: contactEmail,
    lines: [
      'Sport: basketball',
      'Format: 5v5 interest',
      `Contact: ${contactName}`,
      `Email: ${contactEmail}`,
      `Phone: ${contactPhone}`,
      `City: ${data.city?.trim() || 'Not provided'}`,
      `Team / group: ${teamName}`,
      `Interest type: ${data.interest_type}`,
      `Player count: ${data.player_count || 'Not provided'}`,
      `Notes: ${data.notes?.trim() || 'None'}`,
      `Submitted: ${new Date().toISOString()}`,
    ],
  });

  return res.status(200).json({
    success: true,
    message: 'Interest received. OSFNA will follow up with the 5v5 basketball details.',
  });
}
