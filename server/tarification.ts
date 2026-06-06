// Miroir de src/lib/tarification.ts — même logique, côté serveur Express

interface TarifColis {
  poidsMin: number;
  poidsMax: number;
  prixKg:   number;
  minimum:  number;
}

const TARIFS_COLIS: TarifColis[] = [
  { poidsMin: 0,  poidsMax: 5,        prixKg: 8,   minimum: 25  },
  { poidsMin: 5,  poidsMax: 20,       prixKg: 6,   minimum: 30  },
  { poidsMin: 20, poidsMax: 50,       prixKg: 4.5, minimum: 90  },
  { poidsMin: 50, poidsMax: Infinity, prixKg: 3.5, minimum: 175 },
];

interface ElecMatch {
  keywords: string[];
  prix:     number;
  label:    string;
}

const ELECTRO_MATCHES: ElecMatch[] = [
  { keywords: ['machine', 'lave-linge', 'lavelinge', 'linge', 'washing'], prix: 120, label: 'Machine à laver'    },
  { keywords: ['refrigerateur', 'frigo', 'frigidaire'],                   prix: 150, label: 'Réfrigérateur'      },
  { keywords: ['congelateur', 'congel'],                                   prix: 130, label: 'Congélateur'        },
  { keywords: ['television', 'ecran', 'tv', 'tele'],                      prix: 80,  label: 'Télévision'         },
  { keywords: ['climatiseur', 'clim', 'air conditionne'],                  prix: 100, label: 'Climatiseur'        },
  { keywords: ['lave-vaisselle', 'lavevaisselle', 'vaisselle'],            prix: 120, label: 'Lave-vaisselle'     },
  { keywords: ['four', 'micro-onde', 'microonde', 'micro'],               prix: 70,  label: 'Four / micro-onde'  },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function calculerPrixColis(poids: number): number {
  const t = TARIFS_COLIS.find(t => poids >= t.poidsMin && poids < t.poidsMax);
  if (!t) return 0;
  return Math.max(t.minimum, poids * t.prixKg);
}

function detecterElectro(description: string): { prix: number; label: string } | null {
  const desc = normalize(description);
  for (const item of ELECTRO_MATCHES) {
    if (item.keywords.some(kw => desc.includes(normalize(kw)))) {
      return { prix: item.prix, label: item.label };
    }
  }
  return null;
}

export interface ResultatDevis {
  montantHT:  number;
  montantTTC: number;
  detail:     string;
}

export function calculerDevis(params: {
  type_colis:  string;
  poids_kg?:   number | null;
  description?: string;
}): ResultatDevis | null {
  const { type_colis, poids_kg, description } = params;

  if (type_colis === 'vehicule' || type_colis === 'autre') return null;

  let montantHT = 0;
  let detail    = '';

  if (type_colis === 'electromenager') {
    const match = detecterElectro(description ?? '');
    if (!match) return null;
    montantHT = match.prix;
    detail    = match.label;
  } else if (type_colis === 'colis') {
    if (!poids_kg || poids_kg <= 0) return null;
    montantHT = calculerPrixColis(poids_kg);
    detail    = `Colis ${poids_kg} kg`;
  } else {
    return null;
  }

  if (montantHT <= 0) return null;

  const montantTTC = Math.round(montantHT * 1.2 * 100) / 100;
  return { montantHT, montantTTC, detail };
}
