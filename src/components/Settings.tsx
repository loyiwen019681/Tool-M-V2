import React, { useState } from 'react';
import { auth } from '../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { KeyRound, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordsMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('settings.passwordMinLength'));
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-3xl"
    >
      <ThemeSwitcher />

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
                placeholder={t('settings.min6chars')}
              />
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
