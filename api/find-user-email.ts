import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './_admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

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
      let snap = await db.collection('users')
        .where('username', '==', trimmed)
        .limit(1)
        .get();
      if (snap.empty) {
        snap = await db.collection('users')
          .where('username', '==', trimmed.toLowerCase())
          .limit(1)
          .get();
      }
      if (!snap.empty) userEmail = snap.docs[0].data().email as string;
    }

    if (!userEmail) {
      // Don't reveal existence — caller will try sendPasswordResetEmail anyway
      return res.status(200).json({ type: 'notfound' });
    }

    if (userEmail.endsWith('@tooling.local')) {
      return res.status(200).json({ type: 'local' });
    }

    return res.status(200).json({ type: 'real', email: userEmail });
  } catch (err: any) {
    console.error('find-user-email:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
