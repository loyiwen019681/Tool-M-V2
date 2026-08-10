import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './_admin.js';

// Best-effort per-IP throttle. Serverless instances are short-lived and not
// shared, so this stops casual scripted abuse rather than a distributed one.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing without bound on a long-lived instance
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every(t => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  return (raw || '').split(',')[0].trim() || 'unknown';
}

/** Resolve the Firebase Auth email for a username or email, or null. */
async function resolveEmail(input: string): Promise<string | null> {
  const db = getAdminDb();

  if (input.includes('@')) {
    const snap = await db.collection('users')
      .where('email', '==', input.toLowerCase())
      .limit(1)
      .get();
    // Fall back to the raw input: the Auth account may exist without a
    // matching users/ document (e.g. created directly in the console).
    return snap.empty ? input.toLowerCase() : (snap.docs[0].data().email as string);
  }

  for (const candidate of [input, input.toLowerCase()]) {
    const snap = await db.collection('users')
      .where('username', '==', candidate)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0].data().email as string;
  }
  return null;
}

/**
 * Ask Firebase to send its own password-reset email. This is the same
 * Identity Toolkit endpoint the client SDK's sendPasswordResetEmail() calls,
 * so the template, link and expiry are unchanged — only the caller moves
 * server-side, which keeps the address out of the browser.
 */
async function sendResetEmail(email: string): Promise<void> {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('Missing Firebase web API key');

  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    }
  );

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({} as any));
    const code = body?.error?.message || resp.status;
    // EMAIL_NOT_FOUND is expected whenever the address has no account —
    // it must not change what the caller sees.
    if (code !== 'EMAIL_NOT_FOUND') {
      throw new Error(`sendOobCode failed: ${code}`);
    }
  }
}

// Normalise how long every request takes, so the presence of an account
// cannot be read off the response time.
const MIN_RESPONSE_MS = 500;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const startedAt = Date.now();
  const settle = async () => {
    const remaining = MIN_RESPONSE_MS - (Date.now() - startedAt);
    if (remaining > 0) await sleep(remaining);
  };

  if (rateLimited(clientIp(req))) {
    await settle();
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { input } = (req.body || {}) as { input?: string };
  if (!input || !input.trim()) {
    await settle();
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const email = await resolveEmail(input.trim());

    // @tooling.local addresses cannot receive mail, so there is nothing to send.
    if (email && !email.endsWith('@tooling.local')) {
      await sendResetEmail(email);
    }
  } catch (err: any) {
    // Log for operators, but never let the outcome reach the caller —
    // a distinguishable response is what enables account enumeration.
    console.error('request-password-reset:', err.message);
  }

  await settle();
  return res.status(200).json({ ok: true });
}
