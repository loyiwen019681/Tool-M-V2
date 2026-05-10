import React from 'react';
import { useTheme, type Theme, type SidebarStyle } from '../contexts/ThemeContext';
import { Palette, Check, PanelLeft, Languages } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

const COLOR_THEMES: { id: Theme; name: string; primary: string; accent: string; bg: string }[] = [
  { id: 'default', name: 'Noir',       primary: '#09090b', accent: '#F27D26', bg: '#fafafa' },
  { id: 'ocean',   name: 'Ocean',      primary: '#020617', accent: '#0284c7', bg: '#f0f9ff' },
  { id: 'forest',  name: 'Forest',     primary: '#052e16', accent: '#16a34a', bg: '#f0fdf4' },
  { id: 'sunset',  name: 'Sunset',     primary: '#431407', accent: '#ea580c', bg: '#fff7ed' },
  { id: 'royal',   name: 'Royal',      primary: '#2e1065', accent: '#7c3aed', bg: '#faf5ff' },
  { id: 'rose',    name: 'Rose',       primary: '#4c0519', accent: '#e11d48', bg: '#fff1f2' },
  { id: 'amber',   name: 'Amber',      primary: '#451a03', accent: '#d97706', bg: '#fffbeb' },
  { id: 'cyan',    name: 'Cyan',       primary: '#083344', accent: '#0891b2', bg: '#ecfeff' },
  { id: 'slate',   name: 'Slate',      primary: '#0f172a', accent: '#64748b', bg: '#f8fafc' },
];

const SIDEBAR_STYLES: { id: SidebarStyle; nameKey: string; descKey: string; sbBg: string; sbText: string; sbActive: string }[] = [
  { id: 'light',   nameKey: 'theme.light',   descKey: 'appearance.lightDesc',   sbBg: '#ffffff',  sbText: '#a1a1aa', sbActive: '#f4f4f5' },
  { id: 'dark',    nameKey: 'theme.dark',    descKey: 'appearance.darkDesc',    sbBg: '#18181b',  sbText: '#71717a', sbActive: 'rgba(255,255,255,0.1)' },
  { id: 'colored', nameKey: 'theme.colored', descKey: 'appearance.coloredDesc', sbBg: 'accent',   sbText: 'rgba(255,255,255,0.6)', sbActive: 'rgba(255,255,255,0.2)' },
];

function MiniPreview({ primary, accent, bg, sbBg }: { primary: string; accent: string; bg: string; sbBg: string }) {
  const sidebarBg = sbBg === 'accent' ? accent : sbBg;
  return (
    <div className="w-full h-14 rounded-lg overflow-hidden flex shadow-inner" style={{ backgroundColor: bg }}>
      {/* Sidebar */}
      <div className="w-9 h-full flex flex-col gap-1 p-1.5 shrink-0" style={{ backgroundColor: sidebarBg }}>
        <div className="h-1.5 w-4 rounded-full" style={{ backgroundColor: accent, opacity: 0.9 }} />
        <div className="h-1 w-5 rounded-full bg-white/20" />
        <div className="h-1 w-3 rounded-full bg-white/20" />
        <div className="h-1 w-5 rounded-full bg-white/20" />
      </div>
      {/* Content */}
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: primary, opacity: 0.7 }} />
        <div className="flex gap-1 mt-0.5">
          <div className="h-5 flex-1 rounded" style={{ backgroundColor: accent, opacity: 0.15 }} />
          <div className="h-5 flex-1 rounded bg-zinc-100" />
        </div>
        <div className="h-1 w-14 rounded-full bg-zinc-200" />
      </div>
    </div>
  );
}

function SidebarPreview({ sbBg, accent, isSelected }: { sbBg: string; accent: string; isSelected: boolean }) {
  const bg = sbBg === 'accent' ? accent : sbBg;
  const isDark = sbBg === '#18181b' || sbBg === 'accent';
  const dotColor = isDark ? 'rgba(255,255,255,0.3)' : '#d4d4d8';
  const activeDot = isDark ? 'rgba(255,255,255,0.7)' : '#a1a1aa';
  return (
    <div className="w-8 h-20 rounded-lg overflow-hidden flex flex-col gap-1 p-1.5 shadow-inner" style={{ backgroundColor: bg }}>
      {[0,1,2,3].map(i => (
        <div key={i} className="h-1 rounded-full" style={{ width: i === 1 ? '80%' : '60%', backgroundColor: i === 1 ? activeDot : dotColor }} />
      ))}
    </div>
  );
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
];

export function ThemeSwitcher() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, sidebarStyle, setSidebarStyle } = useTheme();
  const currentTheme = COLOR_THEMES.find(ct => ct.id === theme) ?? COLOR_THEMES[0];

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  return (
    <div className="surface-card p-6 sm:p-10 space-y-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
          <Palette className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-zinc-900">{t('appearance.title')}</h3>
          <p className="text-sm text-zinc-500">{t('appearance.subtitle')}</p>
        </div>
      </div>

      {/* Color Themes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('appearance.colorTheme')}</span>
          <div className="flex-1 h-px bg-zinc-100" />
          <span className="text-xs font-semibold text-zinc-500">{currentTheme.name}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {COLOR_THEMES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setTheme(ct.id)}
              className={cn(
                'group relative flex flex-col gap-2 rounded-2xl p-3 transition-all border-2',
                theme === ct.id
                  ? 'border-brand-primary shadow-sm bg-zinc-50'
                  : 'border-transparent hover:bg-zinc-50 hover:border-zinc-200'
              )}
            >
              <MiniPreview primary={ct.primary} accent={ct.accent} bg={ct.bg} sbBg={sidebarStyle === 'colored' ? 'accent' : sidebarStyle === 'dark' ? '#18181b' : '#ffffff'} />
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold text-zinc-600">{ct.name}</span>
                {theme === ct.id && (
                  <div className="h-3.5 w-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: ct.accent }}>
                    <Check className="h-2 w-2 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('common.language')}</span>
          <div className="flex-1 h-px bg-zinc-100" />
        </div>
        <div className="flex gap-3">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLangChange(lang.code)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all',
                i18n.language === lang.code
                  ? 'border-brand-primary bg-zinc-50 text-zinc-900 shadow-sm'
                  : 'border-transparent bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Style */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <PanelLeft className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('appearance.sidebarStyle')}</span>
          <div className="flex-1 h-px bg-zinc-100" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SIDEBAR_STYLES.map((s) => {
            const accentColor = currentTheme.accent;
            return (
              <button
                key={s.id}
                onClick={() => setSidebarStyle(s.id)}
                className={cn(
                  'group relative flex flex-col items-center gap-3 rounded-2xl p-4 transition-all border-2',
                  sidebarStyle === s.id
                    ? 'border-brand-primary bg-zinc-50 shadow-sm'
                    : 'border-transparent hover:bg-zinc-50 hover:border-zinc-200'
                )}
              >
                <SidebarPreview sbBg={s.sbBg} accent={accentColor} isSelected={sidebarStyle === s.id} />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-bold text-zinc-700">{t(s.nameKey)}</span>
                  <span className="text-[10px] text-zinc-400">{t(s.descKey)}</span>
                </div>
                {sidebarStyle === s.id && (
                  <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-brand-primary flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
