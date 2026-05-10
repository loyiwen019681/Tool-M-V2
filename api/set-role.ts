import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminDb, OWNER_EMAILS } from './_admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const auth = getAdminAuth();
    const db = getAdminDb();

    const decoded = await auth.verifyIdToken(token);
    const callerEmail = (decoded.email || '').toLowerCase();
    const callerIsAdmin = (decoded as any).role === 'admin' || OWNER_EMAILS.includes(callerEmail);

    const { uid, role } = (req.body || {}) as { uid?: string; role?: string };

    if (uid) {
      // Admin changing another user's role
      if (!callerIsAdmin) return res.status(403).json({ error: 'Forbidden' });
      if (!['admin', 'user'].includes(role || '')) return res.status(400).json({ error: 'Invalid role' });

      await auth.setCustomUserClaims(uid, { role });
      await db.doc(`users/${uid}`).update({ role });
      return res.status(200).json({ success: true });
    } else {
      // Self-claim on first login — server decides role based on OWNER_EMAILS env var
      const assignRole = OWNER_EMAILS.includes(callerEmail) ? 'admin' : 'user';
      await auth.setCustomUserClaims(decoded.uid, { role: assignRole });

      if (assignRole === 'admin') {
        const ref = db.doc(`users/${decoded.uid}`);
        const snap = await ref.get();
        if (!snap.exists) {
          await ref.set({
            username: 'Owner',
            email: decoded.email || '',
            role: 'admin',
            createdAt: new Date().toISOString(),
          });
        } else if (snap.data()?.role !== 'admin') {
          await ref.update({ role: 'admin' });
        }
      }

      return res.status(200).json({ role: assignRole });
    }
  } catch (err: any) {
    console.error('set-role:', err.message);
    if (err.code?.startsWith?.('auth/')) return res.status(401).json({ error: 'Invalid token' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
