import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '../lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  /** Render as a full-width row (for sidebar use on mobile) */
  inline?: boolean;
}

const LANGUAGES = [
  { code: 'zh', label: '繁體中文', flag: '🇹🇼' },
  { code: 'en', label: 'English',  flag: '🇺🇸' },
  { code: 'ja', label: '日本語',   flag: '🇯🇵' },
];

export default function LanguageSwitcher({ className, inline = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setOpen(false);
  };

  const current = LANGUAGES.find(l => l.code === (i18n.resolvedLanguage || i18n.language)) ?? LANGUAGES[0];

  // ── Inline mode: flat row of buttons (for sidebar) ──────────────────────────
  if (inline) {
    return (
      <div className={cn("flex items-center gap-1 px-1", className)}>
        <Globe className="h-4 w-4 shrink-0 text-zinc-400 mr-1" />
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors",
              current.code === lang.code
                ? "bg-brand-primary text-white"
                : "text-zinc-500 hover:bg-zinc-100"
            )}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    );
  }

  // ── Dropdown mode: for desktop header ───────────────────────────────────────
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors text-xs font-bold"
        title="Language"
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase">{current.code}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 z-50">
          <div className="p-1 flex flex-col gap-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors",
                  current.code === lang.code
                    ? "bg-brand-primary text-white font-bold"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
