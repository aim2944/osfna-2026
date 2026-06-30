const NOTIFY_EMAIL = 'aimonibssa@gmail.com';

export async function notifyAdmin({ subject, name, email, lines }) {
  try {
    await fetch(`https://formsubmit.co/ajax/${NOTIFY_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: subject,
        name: name || 'OSFNA System',
        email: email || NOTIFY_EMAIL,
        message: lines.join('\n'),
        _template: 'table',
      }),
    });
  } catch (e) {
    console.error('[notify] formsubmit failed:', e?.message);
  }
}
