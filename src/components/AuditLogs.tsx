import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Clock, User, Activity, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { useDebounce } from '../lib/useDebounce';
import { useTranslation } from 'react-i18next';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  userEmail: string;
  timestamp: any;
}

export default function AuditLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      setLogs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.action.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [logs, debouncedSearchTerm]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-zinc-200 border-t-zinc-800 rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">{t('auditLogs.title')}</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">{t('auditLogs.subtitle')}</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={t('auditLogs.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <DoubleScrollbar>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-6 py-4 border-b border-zinc-100 sticky left-0 bg-zinc-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{t('auditLogs.colTime')}</th>
                <th className="px-6 py-4 border-b border-zinc-100">{t('auditLogs.colUser')}</th>
                <th className="px-6 py-4 border-b border-zinc-100">{t('auditLogs.colAction')}</th>
                <th className="px-6 py-4 border-b border-zinc-100">{t('auditLogs.colDetails')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <AnimatePresence mode="popLayout">
                {filteredLogs.map((log) => (
                  <motion.tr 
                    key={log.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-zinc-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500 sticky left-0 bg-white group-hover:bg-zinc-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 opacity-40" />
                        <span className="font-mono text-[11px]">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center">
                          <User className="h-3 w-3 text-zinc-500" />
                        </div>
                        <span className="font-medium text-zinc-900">{log.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                        <Activity className="h-3 w-3" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 max-w-md truncate">
                      {log.details}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <Search className="h-8 w-8 opacity-20" />
                      <p className="text-sm">{t('auditLogs.noLogs')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DoubleScrollbar>
      </div>
    </motion.div>
  );
}
