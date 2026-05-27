import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db, storage } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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

async function compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> {
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
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', quality);
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
      const compressed = await compressImage(file, 256, 256, 0.85);
      const storageRef = ref(storage, `avatars/${uid}/avatar.jpg`);
      await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', uid), { avatarUrl: url });
    } finally {
      setUploading(false);
    }
  }, [uid]);

  const uploadBackground = useCallback(async (file: File) => {
    if (!uid) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1920, 1080, 0.80);
      const storageRef = ref(storage, `backgrounds/${uid}/background.jpg`);
      await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', uid), { backgroundUrl: url });
    } finally {
      setUploading(false);
    }
  }, [uid]);

  const removeAvatar = useCallback(async () => {
    if (!uid) return;
    setUploading(true);
    try {
      try { await deleteObject(ref(storage, `avatars/${uid}/avatar.jpg`)); } catch {}
      await updateDoc(doc(db, 'users', uid), { avatarUrl: '' });
    } finally {
      setUploading(false);
    }
  }, [uid]);

  const removeBackground = useCallback(async () => {
    if (!uid) return;
    setUploading(true);
    try {
      try { await deleteObject(ref(storage, `backgrounds/${uid}/background.jpg`)); } catch {}
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
