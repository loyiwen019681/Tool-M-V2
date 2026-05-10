import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Show the drag handle at the top. Default true. */
  showHandle?: boolean;
  /** Extra tall — fills up to 92vh. Default false. */
  tall?: boolean;
}

/**
 * A slide-up bottom sheet with backdrop, used for mobile filter panels,
 * detail views, and action menus.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  showHandle = true,
  tall = false,
}: BottomSheetProps) {
  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          />

          {/* Sheet panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col md:hidden',
              tall ? 'max-h-[92vh]' : 'max-h-[80vh]',
              className
            )}
          >
            {showHandle && (
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="h-1 w-10 bg-zinc-300 rounded-full" />
              </div>
            )}

            {title && (
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 shrink-0">
                <h3 className="font-bold text-zinc-900 text-base">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              </div>
            )}

            <div className="overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
