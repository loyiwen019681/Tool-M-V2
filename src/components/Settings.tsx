import React, { useState, useRef, useMemo } from 'react';
import { auth } from '../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { KeyRound, ShieldCheck, AlertCircle, CheckCircle2, Circle, Loader2, UserCircle, ImageIcon, Upload, X, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '../contexts/UserProfileContext';

export default function Settings() {
  const { t } = useTranslation();
  const { profile, uploadAvatar, uploadBackground, removeAvatar, removeBackground, uploading } = useUserProfile();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const passwordRules = useMemo(() => ({
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasDigits: (newPassword.match(/\d/g) || []).length >= 6,
    hasSpecial: /[^a-zA-Z0-9]/.test(newPassword),
  }), [newPassword]);

  const passwordValid = Object.values(passwordRules).every(Boolean);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File, type: 'avatar' | 'background') => {
    setProfileError(null);
    setProfileSuccess(null);

    if (!file.type.startsWith('image/')) {
      setProfileError(t('profile.invalidType'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileError(t('profile.fileTooLarge'));
      return;
    }

    try {
      if (type === 'avatar') {
        await uploadAvatar(file);
      } else {
        await uploadBackground(file);
      }
      setProfileSuccess(t('profile.uploadSuccess'));
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch {
      setProfileError(t('profile.uploadError'));
    }
  };

  const handleRemove = async (type: 'avatar' | 'background') => {
    setProfileError(null);
    setProfileSuccess(null);
    try {
      if (type === 'avatar') {
        await removeAvatar();
      } else {
        await removeBackground();
      }
      setProfileSuccess(t('profile.removeSuccess'));
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch {
      setProfileError(t('profile.uploadError'));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordsMismatch'));
      return;
    }

    if (!passwordValid) {
      setError(t('settings.passwordTooWeak'));
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      setError(t('settings.userNotFound'));
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t('settings.incorrectPassword'));
      } else if (err.code === 'auth/requires-recent-login') {
        setError(t('settings.requireRelogin'));
      } else {
        setError(err.message || t('settings.changeFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const user = auth.currentUser;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-3xl"
    >
      <ThemeSwitcher />

      {/* ── Profile Customization ─────────────────────────────── */}
      <div className="surface-card p-4 sm:p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
            <UserCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900">{t('profile.title')}</h3>
            <p className="text-sm text-zinc-500">{t('profile.subtitle')}</p>
          </div>
        </div>

        {profileError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">{profileError}</p>
          </motion.div>
        )}

        {profileSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-600 border border-green-100"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="font-medium">{profileSuccess}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {/* Avatar */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
              {t('profile.avatar')}
            </label>
            <p className="text-xs text-zinc-500 ml-1">{t('profile.avatarDesc')}</p>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 rounded-full ring-2 ring-zinc-200 overflow-hidden bg-zinc-100">
                <img
                  src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? t('profile.uploading') : t('profile.upload')}
                </button>
                {profile.avatarUrl && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => handleRemove('avatar')}
                    className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('profile.remove')}
                  </button>
                )}
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, 'avatar');
                e.target.value = '';
              }}
            />
          </div>

          {/* Background Image */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
              {t('profile.background')}
            </label>
            <p className="text-xs text-zinc-500 ml-1">{t('profile.backgroundDesc')}</p>
            <div
              className="relative h-24 w-full rounded-xl overflow-hidden ring-2 ring-zinc-200 bg-zinc-100 cursor-pointer group"
              onClick={() => !uploading && bgInputRef.current?.click()}
            >
              {profile.backgroundUrl ? (
                <img src={profile.backgroundUrl} alt="Background" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
                  <ImageIcon className="h-8 w-8 text-zinc-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="text-white text-xs font-bold flex items-center gap-1">
                  <Upload className="h-3.5 w-3.5" />
                  {t('profile.upload')}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => bgInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? t('profile.uploading') : t('profile.upload')}
              </button>
              {profile.backgroundUrl && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleRemove('background')}
                  className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('profile.remove')}
                </button>
              )}
            </div>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, 'background');
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Security Settings ─────────────────────────────────── */}
      <div className="surface-card p-4 sm:p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900">{t('settings.title')}</h3>
            <p className="text-sm text-zinc-500">{t('settings.subtitle')}</p>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-600 border border-green-100"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="font-medium">{t('settings.success')}</p>
          </motion.div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
              {t('settings.currentPassword')}
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all"
              placeholder={t('settings.enterCurrent')}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                {t('settings.newPassword')}
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all"
                placeholder={t('settings.passwordPlaceholder')}
              />
              {newPassword && (
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {([
                    { key: 'hasUpper', label: t('settings.passwordRule.upper') },
                    { key: 'hasLower', label: t('settings.passwordRule.lower') },
                    { key: 'hasDigits', label: t('settings.passwordRule.digits') },
                    { key: 'hasSpecial', label: t('settings.passwordRule.special') },
                  ] as { key: keyof typeof passwordRules; label: string }[]).map(({ key, label }) => {
                    const met = passwordRules[key];
                    return (
                      <div key={key} className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${met ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {met
                          ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                          : <Circle className="h-3 w-3 shrink-0" />}
                        {label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                {t('settings.confirmPassword')}
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all"
                placeholder={t('settings.enterConfirm')}
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? t('settings.updating') : t('settings.update')}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
