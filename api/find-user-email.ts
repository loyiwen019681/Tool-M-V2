import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './_admin.js';

// Simple in-memory rate limiter: max 5 requests per IP per minute
// (resets on cold start — intentional; prevents bulk enumeration within a single instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip = (req.headers['x-forwarded-for'] as string || '127.0.0.1').split(',')[0].trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { input } = (req.body || {}) as { input?: string };
  if (!input || !input.trim()) return res.status(400).json({ error: 'Invalid input' });

  const trimmed = input.trim();

  try {
    const db = getAdminDb();
    let userEmail: string | null = null;

    if (trimmed.includes('@')) {
      const snap = await db.collection('users')
        .where('email', '==', trimmed.toLowerCase())
        .limit(1)
        .get();
      if (!snap.empty) userEmail = snap.docs[0].data().email as string;
    } else {
      // Username lookup — try exact case first, then lowercase
      let snap = await db.collection('users').where('username', '==', trimmed).limit(1).get();
      if (snap.empty) {
        snap = await db.collection('users').where('username', '==', trimmed.toLowerCase()).limit(1).get();
      }
      if (!snap.empty) userEmail = snap.docs[0].data().email as string;
    }

    // @tooling.local accounts cannot receive Firebase reset emails — tell the user to contact admin.
    // For notfound, return same 'notfound' type; caller will attempt sendPasswordResetEmail
    // with the original input (Firebase email enumeration protection handles it safely).
    if (userEmail && userEmail.endsWith('@tooling.local')) {
      return res.status(200).json({ type: 'local' });
    }

    if (!userEmail) {
      return res.status(200).json({ type: 'notfound' });
    }

    return res.status(200).json({ type: 'real', email: userEmail });
  } catch (err: any) {
    console.error('find-user-email:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
