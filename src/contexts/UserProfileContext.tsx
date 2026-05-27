import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface UserProfile {
  avatarUrl: string;
  backgroundUrl: string;
}

interface UserProfileContextType {
  profile: UserProfile;
  uploadAvatar: (file: File) => Promise<void>;
  uploadBackground: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
  removeBackground: () => Promise<void>;
  uploading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType>({
  profile: { avatarUrl: '', backgroundUrl: '' },
  uploadAvatar: async () => {},
  uploadBackground: async () => {},
  removeAvatar: async () => {},
  removeBackground: async () => {},
  uploading: false,
});

// Compress image and return base64 dataURL for Firestore storage (no Firebase Storage needed)
async function compressToDataURL(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>({ avatarUrl: '', backgroundUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
      if (!user) setProfile({ avatarUrl: '', backgroundUrl: '' });
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          avatarUrl: data.avatarUrl || '',
          backgroundUrl: data.backgroundUrl || '',
        });
      }
    });
  }, [uid]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!uid) return;
    setUploading(true);
    try {
      // Avatar: max 200×200, quality 0.82 → ~5–15KB as base64
      const dataUrl = await compressToDataURL(file, 200, 200, 0.82);
      await updateDoc(doc(db, 'users', uid), { avatarUrl: dataUrl });
    } finally {
      setUploading(false);
    }
  }, [uid]);

  const uploadBackground = useCallback(async (file: File) => {
    if (!uid) return;
    setUploading(true);
    try {
      // Background: max 1280×720, quality 0.65 → ~30–100KB as base64
      const dataUrl = await compressToDataURL(file, 1280, 720, 0.65);
      // Firestore document limit is 1MB; reject if compressed result is too large
      if (dataUrl.length > 400000) {
        throw new Error('COMPRESSED_TOO_LARGE');
      }
      await updateDoc(doc(db, 'users', uid), { backgroundUrl: dataUrl });
    } finally {
      setUploading(false);
    }
  }, [uid]);

  const removeAvatar = useCallback(async () => {
    if (!uid) return;
    setUploading(true);
    try {
      await updateDoc(doc(db, 'users', uid), { avatarUrl: '' });
    } finally {
      setUploading(false);
    }
  }, [uid]);

  const removeBackground = useCallback(async () => {
    if (!uid) return;
    setUploading(true);
    try {
      await updateDoc(doc(db, 'users', uid), { backgroundUrl: '' });
    } finally {
      setUploading(false);
    }
  }, [uid]);

  return (
    <UserProfileContext.Provider value={{ profile, uploadAvatar, uploadBackground, removeAvatar, removeBackground, uploading }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
