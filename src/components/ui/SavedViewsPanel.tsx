import React, { useState } from 'react';
import { Bookmark, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SavedView } from '../../lib/useSavedViews';
import { useTranslation } from 'react-i18next';

interface SavedViewsPanelProps {
  views: SavedView[];
  onApply: (filters: Record<string, unknown>) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}

export default function SavedViewsPanel({ views, onApply, onSave, onDelete }: SavedViewsPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    onSave(name);
    setSaveName('');
    setShowSaveInput(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        title={t('views.title')}
      >
        <Bookmark className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('views.preset')}</span>
        {views.length > 0 && (
          <span className="bg-brand-primary/10 text-brand-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold">
            {views.length}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 z-50 w-64 rounded-2xl bg-white border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="p-3 border-b border-zinc-100 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('views.title')}</span>
                <button
                  onClick={() => { setShowSaveInput(s => !s); setSaveName(''); }}
                  className="flex items-center gap-1 text-xs text-brand-primary hover:underline font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('views.saveCurrent')}
                </button>
              </div>

              <AnimatePresence>
                {showSaveInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 border-b border-zinc-100 flex gap-2">
                      <input
                        autoFocus
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false); }}
                        placeholder={t('views.namePlaceholder')}
                        className="flex-1 text-xs border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-primary"
                      />
                      <button onClick={handleSave} className="px-2 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:opacity-90">
                        {t('common.save')}
                      </button>
                      <button onClick={() => setShowSaveInput(false)} className="p-1.5 text-zinc-400 hover:text-zinc-700">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="max-h-60 overflow-y-auto py-1">
                {views.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-zinc-400 text-center">{t('views.empty')}</p>
                ) : (
                  views.map(view => (
                    <div key={view.id} className="flex items-center gap-1 px-2 py-1.5 hover:bg-zinc-50 group">
                      <button
                        className="flex-1 text-left text-sm text-zinc-700 group-hover:text-zinc-900 truncate px-1"
                        onClick={() => { onApply(view.filters); setIsOpen(false); }}
                      >
                        {view.name}
                      </button>
                      <button
                        onClick={() => onDelete(view.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
