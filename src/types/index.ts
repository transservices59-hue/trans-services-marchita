export type Role = 'client' | 'store' | 'transporter' | 'broker';

export type StatutDossier =
  // Anciens statuts (backward compat)
  | 'brouillon'
  | 'en_attente'
  | 'devis_envoye'
  | 'devis_attente_validation'
  | 'valide'
  | 'paye'
  | 'facture_generee'
  | 'annule'
  // Nouveaux statuts workflow
  | 'en_attente_paiement'
  | 'en_preparation'
  | 'recu_store'
  | 'en_transit'
  | 'arrive_maroc'
  | 'disponible_retrait'
  | 'livre'
  | 'litige';

export type StatutDemande =
  | 'nouvelle'
  | 'en_traitement'
  | 'devis_envoye'
  | 'acceptee'
  | 'refusee'
  | 'expiree';

export type StatutDevis =
  | 'brouillon'
  | 'envoye'
  | 'accepte'
  | 'refuse'
  | 'expire'
  | 'modifie';

export type TypeColis = 'colis' | 'electromenager' | 'vehicule' | 'autre';
export type TypeTransporteur = 'camion' | 'courtier';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: Role;
  created_at: string;
}

export interface DevisOfficiel {
  id: string;
  demande_id: string | null;
  numero: string;
  montant_ht: number;
  tva_pct: number;
  montant_ttc: number;
  validite_jours: number;
  statut: StatutDevis;
  pdf_url: string | null;
  notes: string | null;
  envoye_le: string | null;
  accepte_le: string | null;
  refuse_le: string | null;
  token_acceptation: string | null;
  token_refus: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dossier {
  id: string;
  numero: string;
  client_id: string;
  transporteur_id: string | null;
  statut: StatutDossier;
  type_colis: TypeColis;
  description: string;
  poids_kg: number | null;
  volume_m3: number | null;
  adresse_depart: string;
  adresse_arrivee: string;
  montant_devis: number | null;
  devis_officiel_id: string | null;
  numero_suivi: string | null;
  paiement_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  paye_le: string | null;
  created_at: string;
  updated_at: string;
  client?: Profile;
  transporteur?: Transporteur;
  factures?: Facture[];
  devis_items?: DevisItem[];
  devis_officiel?: DevisOfficiel;
}

export interface Transporteur {
  id: string;
  code: string;
  nom: string;
  type: TypeTransporteur;
  telephone: string;
  actif: boolean;
  created_at: string;
}

export interface PositionGPS {
  id: string;
  transporteur_id: string;
  latitude: number;
  longitude: number;
  vitesse_kmh: number | null;
  cap: number | null;
  created_at: string;
  transporteur?: Transporteur;
}

export interface DernierePosition {
  transporteur_id: string;
  code: string;
  nom: string;
  type: TypeTransporteur;
  actif: boolean;
  latitude: number;
  longitude: number;
  vitesse_kmh: number | null;
  derniere_maj: string;
}

export interface Facture {
  id: string;
  dossier_id: string;
  numero: string;
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  pdf_url: string | null;
  created_at: string;
}

export interface DevisItem {
  id: string;
  dossier_id: string;
  label: string;
  montant: number;
  created_at: string;
}
