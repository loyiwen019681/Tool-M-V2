import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ja from './locales/ja';

const savedLang = localStorage.getItem('lang') || 'en';

i18next
  .use(initReactI18next)
  .init({
    lng: savedLang,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      ja: { translation: ja },
    },
    interpolation: { escapeValue: false },
  });

export default i18next;
