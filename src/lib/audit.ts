import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logAuditAction = async (action: string, details: string) => {
  try {
    const user = auth.currentUser;
    const userEmail = user?.email || 'Unknown User';
    
    await addDoc(collection(db, 'auditLogs'), {
      action,
      details,
      userEmail,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
};
