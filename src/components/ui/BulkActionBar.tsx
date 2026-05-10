import React from 'react';
import { Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface BulkActionBarProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}

export default function BulkActionBar({ count, onDelete, onClear }: BulkActionBarProps) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-2xl bg-zinc-900 px-6 py-3 shadow-2xl text-white"
        >
          <span className="text-sm font-medium"><span className="font-bold text-amber-400">{count}</span> {t('bulk.selected')}</span>
          <div className="h-4 w-px bg-zinc-600" />
          <button
            onClick={onDelete}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-1.5 text-sm font-bold hover:bg-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {t('bulk.deleteSelected')}
          </button>
          <button onClick={onClear} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
