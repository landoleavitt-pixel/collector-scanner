/* POST /api/waitlist
 *
 * Adds an email to a Resend Audience. No database, no schema, no PII storage
 * on our side — Resend holds the list and we just call their API.
 *
 * Required env vars:
 *   RESEND_API_KEY      — from resend.com → API Keys
 *   RESEND_AUDIENCE_ID  — from resend.com → Audiences → (your audience) → ID
 *
 * If either is missing in production, the endpoint returns a 503 so the form
 * still degrades gracefully instead of throwing a 500. In dev with no key,
 * we log to the console and return success so the UI can be tested.
 */

export const runtime = 'edge';

// Basic shape check. The real validation happens at Resend.
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = body?.email;

  if (!isValidEmail(email)) {
    return Response.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  // Dev fallback — if no key is configured, accept and log. Lets the UI
  // be tested without env setup; production must have the keys.
  if (!apiKey || !audienceId) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Waitlist: RESEND_API_KEY or RESEND_AUDIENCE_ID missing.');
      return Response.json(
        { error: 'Waitlist is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    console.log(`[dev waitlist] would add ${email.trim()} to Resend Audience`);
    return Response.json({ ok: true });
  }

  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          unsubscribed: false,
        }),
      }
    );

    // Resend returns 200 on create. If the contact already exists they
    // also return 200 with the same shape — that's fine, we treat it as success.
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('Resend Audiences error:', res.status, data);
      // Don't leak Resend error details — give a generic message.
      return Response.json(
        { error: 'We couldn\'t add you right now. Please try again.' },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Waitlist fetch failed:', err);
    return Response.json(
      { error: 'Network error. Please try again.' },
      { status: 500 }
    );
  }
}
