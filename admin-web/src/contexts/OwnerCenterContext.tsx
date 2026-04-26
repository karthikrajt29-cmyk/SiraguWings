import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOwnerCenters, type CenterSummary } from '../api/centers.api';
import { useAuth } from './AuthContext';

interface OwnerCenterContextValue {
  centerId: string | null;
  setCenterId: (id: string) => void;
  centers: CenterSummary[];
  loading: boolean;
  isError: boolean;
  refetch: () => void;
}

const OwnerCenterContext = createContext<OwnerCenterContextValue | null>(null);

const STORAGE_KEY = 'sw.ownerActiveCenter';

export function OwnerCenterProvider({ children }: { children: React.ReactNode }) {
  const { isOwner, activePortal } = useAuth();
  const enabled = isOwner && activePortal === 'owner';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['owner', 'centers'],
    queryFn: getOwnerCenters,
    enabled,
  });

  const centers = data ?? [];

  const [centerId, setCenterIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  // Once centers load, validate the stored ID; fall back to the first center.
  useEffect(() => {
    if (!centers.length) return;
    const validIds = new Set(centers.map((c) => c.id));
    if (!centerId || !validIds.has(centerId)) {
      const next = centers[0].id;
      setCenterIdState(next);
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, [centers, centerId]);

  const setCenterId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setCenterIdState(id);
  };

  const value = useMemo<OwnerCenterContextValue>(
    () => ({
      centerId,
      setCenterId,
      centers,
      loading: isLoading,
      isError,
      refetch: () => {
        refetch();
      },
    }),
    [centerId, centers, isLoading, isError, refetch],
  );

  return <OwnerCenterContext.Provider value={value}>{children}</OwnerCenterContext.Provider>;
}

export function useOwnerCenter() {
  const ctx = useContext(OwnerCenterContext);
  if (!ctx) throw new Error('useOwnerCenter must be used inside OwnerCenterProvider');
  return ctx;
}
