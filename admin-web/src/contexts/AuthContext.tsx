import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../firebase';
import { verifyToken, type TokenResponse } from '../api/auth.api';

export type Portal = 'admin' | 'owner';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: TokenResponse | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  ownedCenterIds: string[];
  activePortal: Portal;
  setActivePortal: (p: Portal) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PORTAL_STORAGE_KEY = 'sw.activePortal';

function readStoredPortal(): Portal | null {
  const v = localStorage.getItem(PORTAL_STORAGE_KEY);
  return v === 'admin' || v === 'owner' ? v : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [storedPortal, setStoredPortal] = useState<Portal | null>(readStoredPortal);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          const data = await verifyToken(token);
          setProfile(data);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    localStorage.removeItem(PORTAL_STORAGE_KEY);
    setStoredPortal(null);
  };

  const isAdmin = profile?.roles.some((r) => r.role === 'Admin') ?? false;
  const isOwner = profile?.roles.some((r) => r.role === 'Owner') ?? false;

  const ownedCenterIds = useMemo(
    () =>
      profile?.roles
        .filter((r) => r.role === 'Owner' && r.center_id)
        .map((r) => r.center_id as string) ?? [],
    [profile],
  );

  // Resolve effective portal:
  // - Admin-only → 'admin'
  // - Owner-only → 'owner'
  // - Both → stored preference, default 'admin'
  // - Neither → 'admin' (irrelevant; route guards will block)
  const activePortal: Portal = (() => {
    if (isAdmin && !isOwner) return 'admin';
    if (isOwner && !isAdmin) return 'owner';
    if (isAdmin && isOwner) return storedPortal ?? 'admin';
    return 'admin';
  })();

  const setActivePortal = (p: Portal) => {
    localStorage.setItem(PORTAL_STORAGE_KEY, p);
    setStoredPortal(p);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAdmin,
        isOwner,
        ownedCenterIds,
        activePortal,
        setActivePortal,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
