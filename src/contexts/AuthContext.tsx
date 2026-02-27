import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const DEMO_TOKEN = import.meta.env.VITE_DEMO_TOKEN;
const DEMO_KEY = 'tripsheet_demo_mode';
const EMAIL_KEY = 'tripsheet_email_for_signin';

interface AuthContextValue {
  user: User | null;
  isDemoMode: boolean;
  isAuthLoading: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // ── 1. Check for demo token in URL ─────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get('demo');
    if (demoParam && demoParam === DEMO_TOKEN) {
      localStorage.setItem(DEMO_KEY, 'true');
      // Strip the param from the URL without reloading
      params.delete('demo');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    if (localStorage.getItem(DEMO_KEY) === 'true') {
      setIsDemoMode(true);
    }

    // ── 2. Complete magic link sign-in if this is a link redirect ──────────
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem(EMAIL_KEY);
      if (!email) {
        email = window.prompt('Please enter your email to confirm sign-in:');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            localStorage.removeItem(EMAIL_KEY);
            // Strip Firebase query params from URL
            window.history.replaceState({}, '', window.location.pathname);
          })
          .catch(err => console.error('Magic link sign-in failed:', err));
      }
    }

    // ── 3. Listen to auth state ─────────────────────────────────────────────
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });
    return unsub;
  }, []);

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

  return (
    <AuthContext.Provider value={{ user, isDemoMode, isAuthLoading, sendMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
