import { createClient } from '@supabase/supabase-js';
import type { Dossier, Transporteur } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getProfile = (userId: string) =>
  supabase.from('profiles').select('*').eq('id', userId).single();

// ─── Dossiers (client) ───────────────────────────────────────────────────────

export const getDossiersByClient = (clientId: string) =>
  supabase
    .from('dossiers')
    .select('*, transporteur:transporteurs(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

export const getDossierById = (id: string) =>
  supabase
    .from('dossiers')
    .select('*, client:profiles(*), transporteur:transporteurs(*), factures(*), devis_items(*)')
    .eq('id', id)
    .single();

export const validerDevis = (dossierId: string) =>
  supabase
    .from('dossiers')
    .update({ statut: 'valide', updated_at: new Date().toISOString() })
    .eq('id', dossierId);

// ─── Dossiers (store) ────────────────────────────────────────────────────────

export interface DossierFilters {
  statut?: string;
  typeColis?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const getAllDossiers = (filters: DossierFilters = {}) => {
  const { statut, typeColis, search, page = 1, pageSize = 20 } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('dossiers')
    .select('*, client:profiles(*), transporteur:transporteurs(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (statut) query = query.eq('statut', statut);
  if (typeColis) query = query.eq('type_colis', typeColis);
  if (search) query = query.or(`numero.ilike.%${search}%`);

  return query;
};

// ─── Transporteurs ───────────────────────────────────────────────────────────

export const getTransporteurs = () =>
  supabase.from('transporteurs').select('*').order('code');

export const addTransporteur = (data: Omit<Transporteur, 'id' | 'created_at' | 'actif'>) =>
  supabase.from('transporteurs').insert({ ...data, actif: true }).select().single();

export const toggleTransporteur = (id: string, actif: boolean) =>
  supabase.from('transporteurs').update({ actif }).eq('id', id);

// ─── GPS ─────────────────────────────────────────────────────────────────────

export const getDernieresPositions = () =>
  supabase.from('derniere_position').select('*');

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const createDemandePublique = (data: {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  type_colis: string;
  description: string;
  adresse_depart: string;
  adresse_arrivee: string;
  poids_kg?: number;
}) =>
  supabase.from('demandes_publiques').insert(data).select().single();

export { type Dossier };
