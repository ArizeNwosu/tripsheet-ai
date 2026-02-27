import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const FREE_EXPORT_LIMIT = 3;

const DEMO_TOKEN = import.meta.env.VITE_DEMO_TOKEN;
const DEMO_KEY = 'tripsheet_demo_mode';
const EMAIL_KEY = 'tripsheet_email_for_signin';

interface AuthContextValue {
  user: User | null;
  isDemoMode: boolean;
  isAuthLoading: boolean;
  exportCount: number;
  isSubscribed: boolean;
  canExport: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  recordExport: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [exportCount, setExportCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // ── Demo token check ──────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get('demo');
    if (demoParam && demoParam === DEMO_TOKEN) {
      localStorage.setItem(DEMO_KEY, 'true');
      params.delete('demo');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    if (localStorage.getItem(DEMO_KEY) === 'true') {
      setIsDemoMode(true);
    }

    // Complete magic link sign-in if redirected back
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem(EMAIL_KEY);
      if (!email) {
        email = window.prompt('Please enter your email to confirm sign-in:');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            localStorage.removeItem(EMAIL_KEY);
            window.history.replaceState({}, '', window.location.pathname);
          })
          .catch(err => console.error('Magic link sign-in failed:', err));
      }
    }

    // Auth state listener
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── Load / create Firestore user doc when user changes ───────────────────
  useEffect(() => {
    if (!user) {
      setExportCount(0);
      setIsSubscribed(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    getDoc(userRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setExportCount(data.exportCount ?? 0);
        setIsSubscribed(data.isSubscribed ?? false);
      } else {
        // First time — create the user document
        setDoc(userRef, {
          email: user.email,
          createdAt: new Date(),
          exportCount: 0,
          isSubscribed: false,
        });
        setExportCount(0);
        setIsSubscribed(false);
      }
    }).catch(err => console.error('Failed to load user data:', err));
  }, [user]);

  const canExport = isDemoMode || isSubscribed || exportCount < FREE_EXPORT_LIMIT;

  const sendMagicLink = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem(EMAIL_KEY, email);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const recordExport = async () => {
    if (!user || isDemoMode || isSubscribed) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { exportCount: increment(1) });
    setExportCount(prev => prev + 1);
  };

  const refreshUserData = async () => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      setExportCount(data.exportCount ?? 0);
      setIsSubscribed(data.isSubscribed ?? false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isDemoMode,
      isAuthLoading,
      exportCount,
      isSubscribed,
      canExport,
      sendMagicLink,
      signOut,
      recordExport,
      refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
