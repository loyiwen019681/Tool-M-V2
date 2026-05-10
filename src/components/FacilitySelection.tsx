import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Building2, Loader2, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useTranslation } from 'react-i18next';

export default function FacilitySelection({ onSelect }: { onSelect: (facility: string) => void }) {
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const cachedFacilities = sessionStorage.getItem('cachedFacilities');
        if (cachedFacilities) {
          setFacilities(JSON.parse(cachedFacilities));
          setLoading(false);
          return; // Skip fetching to save read operations and quota
        }

        const collectionsToScan = ['products', 'sockets', 'changeKits', 'loadBoards', 'pogoPins', 'lifeTimes'];
        const uniqueFacilities = new Set<string>();

        const snapshots = await Promise.all(
          collectionsToScan.map(colName => getDocs(collection(db, colName)))
        );

        snapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            const fac = doc.data().facility;
            if (fac && typeof fac === 'string') {
              uniqueFacilities.add(fac.trim().toUpperCase());
            }
          });
        });

        const facilitiesList = Array.from(uniqueFacilities).sort();
        setFacilities(facilitiesList);
        sessionStorage.setItem('cachedFacilities', JSON.stringify(facilitiesList));
      } catch (error) {
        console.error("Error fetching facilities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, []);

  return (
    <div className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-zinc-200"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-bold">{t('facilitySelection.signOut')}</span>
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary text-white mb-6 shadow-xl shadow-brand-primary/20">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-4xl italic tracking-tight text-zinc-900 mb-3">{t('facilitySelection.title')}</h1>
          <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold">{t('facilitySelection.subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          </div>
        ) : facilities.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border border-zinc-200 shadow-sm">
            <p className="text-zinc-500">{t('facilitySelection.noData')}</p>
            <button 
              onClick={() => onSelect('ALL')}
              className="mt-6 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
            >
              {t('facilitySelection.continue')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {facilities.map((facility, idx) => (
              <motion.button
                key={facility}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelect(facility)}
                className="group relative overflow-hidden rounded-3xl bg-white p-8 text-left shadow-sm border border-zinc-200 hover:border-brand-primary hover:shadow-xl hover:shadow-brand-primary/10 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />
                <h3 className="text-2xl font-bold text-zinc-900 group-hover:text-brand-primary transition-colors">{facility}</h3>
                <p className="mt-2 text-xs text-zinc-400 uppercase tracking-wider font-bold"><span dangerouslySetInnerHTML={{ __html: t('facilitySelection.viewData') }} /></p>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
