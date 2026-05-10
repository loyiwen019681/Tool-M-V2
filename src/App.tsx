import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FacilitySelection from './components/FacilitySelection';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import OfflineBanner from './components/OfflineBanner';
import ToastContainer from './components/ui/ToastContainer';

async function claimRole(user: User): Promise<string | null> {
  try {
    // First check existing claims (no network round-trip)
    let tokenResult = await user.getIdTokenResult();
    const existingRole = tokenResult.claims.role as string | undefined;
    if (existingRole) return existingRole;

    // No claim yet — ask server to assign one (server checks OWNER_EMAILS env var)
    const idToken = await user.getIdToken();
    const resp = await fetch('/api/set-role', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (resp.ok) {
      // Force-refresh to get new claims embedded in token
      tokenResult = await user.getIdTokenResult(true);
      return (tokenResult.claims.role as string) || null;
    }
  } catch (e) {
    console.error('claimRole error:', e);
  }
  return null;
}

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (currentUser) {
        // Role comes from JWT custom claims — no hardcoded emails in frontend
        const initialRole = await claimRole(currentUser);
        setRole(initialRole);
        setLoading(false);

        // Watch user doc: if admin changes this user's role, force-refresh token
        unsubscribeDoc = onSnapshot(
          doc(db, 'users', currentUser.uid),
          async (snap) => {
            if (!snap.exists()) return;
            const docRole = snap.data()?.role as string | undefined;
            if (!docRole) return;

            const tokenResult = await currentUser.getIdTokenResult(false);
            const tokenRole = tokenResult.claims.role as string | undefined;

            if (docRole !== tokenRole) {
              // Role was changed by admin — refresh token to pick up new claim
              const refreshed = await currentUser.getIdTokenResult(true);
              setRole((refreshed.claims.role as string) || null);
            }
          },
          (error: any) => {
            if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
              setQuotaExceeded(true);
            }
          }
        );
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <ToastProvider>
    <ThemeProvider>
      <div className="min-h-screen bg-bg-canvas">
        <OfflineBanner />
        <AnimatePresence>
          {quotaExceeded && (
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-6 py-3 shadow-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-bold tracking-wide">
                  {t('errors.quotaExceeded')}
                </p>
              </div>
              <button
                onClick={() => setQuotaExceeded(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ToastContainer />
        <Router>
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" /> : <Login />}
            />
            <Route
              path="/*"
              element={
                user ? (
                  selectedFacility ? (
                    <DataProvider>
                      <Dashboard
                        user={user}
                        role={role}
                        selectedFacility={selectedFacility}
                        onBackToFacility={() => {
                          Object.keys(window.sessionStorage).forEach(key => {
                            if (key.includes('_filter')) window.sessionStorage.removeItem(key);
                          });
                          setSelectedFacility(null);
                        }}
                      />
                    </DataProvider>
                  ) : (
                    <FacilitySelection onSelect={(facility) => {
                      Object.keys(window.sessionStorage).forEach(key => {
                        if (key.includes('_filter')) window.sessionStorage.removeItem(key);
                      });
                      setSelectedFacility(facility);
                    }} />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </Router>
      </div>
    </ThemeProvider>
    </ToastProvider>
  );
}
