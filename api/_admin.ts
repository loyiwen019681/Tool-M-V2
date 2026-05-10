import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function initAdmin() {
  if (getApps().length > 0) return;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  initializeApp({ credential: cert(sa) });
}

export function getAdminAuth() {
  initAdmin();
  return getAuth();
}

export function getAdminDb() {
  initAdmin();
  const dbId = process.env.FIREBASE_DATABASE_ID || '(default)';
  return getFirestore(dbId);
}

// Server-side only — never exposed to frontend
export const OWNER_EMAILS: string[] = (process.env.OWNER_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export async function verifyAdminCaller(idToken: string): Promise<boolean> {
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const email = (decoded.email || '').toLowerCase();
  return decoded.role === 'admin' || OWNER_EMAILS.includes(email);
}
