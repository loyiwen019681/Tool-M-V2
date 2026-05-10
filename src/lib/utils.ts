import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18next from 'i18next';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirestoreErrorMessage(error: any): string {
  if (!error) return i18next.t('errors.unknown');

  const code = error.code || error.message;

  if (code === 'resource-exhausted' || (typeof code === 'string' && code.includes('quota'))) {
    return i18next.t('errors.quotaExceeded');
  }

  if (code === 'permission-denied') {
    return i18next.t('errors.permissionDenied');
  }

  if (code === 'unavailable') {
    return i18next.t('errors.networkError');
  }

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return i18next.t('errors.invalidCredentials');
  }

  if (code === 'auth/too-many-requests') {
    return i18next.t('errors.accountLocked');
  }

  return error.message || i18next.t('error.unknownRetry');
}
