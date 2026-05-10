import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminDb, verifyAdminCaller } from './_admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const isAdmin = await verifyAdminCaller(token);
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const auth = getAdminAuth();
    const db = getAdminDb();

    const { uid } = (req.body || {}) as { uid?: string };
    if (!uid) return res.status(400).json({ error: 'UID required' });

    await auth.deleteUser(uid);
    await db.doc(`users/${uid}`).delete();

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('delete-user:', err.message);
    if (err.code?.startsWith?.('auth/')) return res.status(401).json({ error: 'Auth error' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
