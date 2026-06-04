import { useEffect, useState, useCallback } from 'react';
import { getDossiersByClient, getAllDossiers, type DossierFilters } from '../lib/supabase';
import type { Dossier } from '../types';

export function useClientDossiers(clientId: string | undefined) {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data, error: err } = await getDossiersByClient(clientId);
    if (err) setError(err.message);
    else setDossiers((data as Dossier[]) ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { dossiers, loading, error, refetch: fetch };
}

export function useAllDossiers(filters: DossierFilters = {}) {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error: err, count } = await getAllDossiers(filters);
    if (err) setError(err.message);
    else {
      setDossiers((data as Dossier[]) ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  return { dossiers, total, loading, error, refetch: fetch };
}
