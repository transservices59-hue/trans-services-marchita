export interface TarifColis {
  label: string;
  poidsMin: number;
  poidsMax: number;
  prixKg: number;
  minimum: number;
}

export const TARIFS_COLIS: TarifColis[] = [
  { label: '0 – 5 kg',   poidsMin: 0,   poidsMax: 5,        prixKg: 8,   minimum: 25  },
  { label: '5 – 20 kg',  poidsMin: 5,   poidsMax: 20,       prixKg: 6,   minimum: 30  },
  { label: '20 – 50 kg', poidsMin: 20,  poidsMax: 50,       prixKg: 4.5, minimum: 90  },
  { label: '50 kg +',    poidsMin: 50,  poidsMax: Infinity,  prixKg: 3.5, minimum: 175 },
];

export interface TarifElectromenager {
  type: string;
  prix: number;
}

export const TARIFS_ELECTROMENAGER: TarifElectromenager[] = [
  { type: 'Machine à laver',  prix: 120 },
  { type: 'Réfrigérateur',    prix: 150 },
  { type: 'Congélateur',      prix: 130 },
  { type: 'Télévision',       prix: 80  },
  { type: 'Climatiseur',      prix: 100 },
  { type: 'Lave-vaisselle',   prix: 120 },
  { type: 'Four / micro-onde',prix: 70  },
];

export function calculerPrixColis(poids: number): number {
  const tarif = TARIFS_COLIS.find(t => poids >= t.poidsMin && poids < t.poidsMax);
  if (!tarif) return 0;
  return Math.max(tarif.minimum, poids * tarif.prixKg);
}
