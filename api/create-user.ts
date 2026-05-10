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

    const { username, email, password, role } = (req.body || {}) as {
      username?: string; email?: string; password?: string; role?: string;
    };

    if (!username || !email || !password || !['admin', 'user'].includes(role || '')) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const userRecord = await auth.createUser({ email, password, displayName: username });
    await auth.setCustomUserClaims(userRecord.uid, { role });
    await db.doc(`users/${userRecord.uid}`).set({
      username,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, uid: userRecord.uid });
  } catch (err: any) {
    console.error('create-user:', err.message);
    if (err.code === 'auth/email-already-exists') return res.status(409).json({ error: 'Email already in use' });
    if (err.code?.startsWith?.('auth/')) return res.status(401).json({ error: 'Auth error' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
