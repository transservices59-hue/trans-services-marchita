import type { StatutDossier, Dossier } from '../types';

interface Step {
  key: string;
  label: string;
  icon: string;
  statuts: StatutDossier[];
  reached: (d: Dossier) => boolean;
}

const STEPS: Step[] = [
  {
    key: 'demande',
    label: 'Demande reçue',
    icon: '📋',
    statuts: ['brouillon', 'en_attente'],
    reached: () => true,
  },
  {
    key: 'devis',
    label: 'Devis envoyé',
    icon: '📄',
    statuts: ['devis_envoye', 'devis_attente_validation'],
    reached: d => ['devis_envoye','devis_attente_validation','valide','paye','en_transit','livre','facture_generee'].includes(d.statut),
  },
  {
    key: 'paye',
    label: 'Payé & facturé',
    icon: '💳',
    statuts: ['valide', 'paye', 'facture_generee'],
    reached: d => ['valide','paye','en_transit','livre','facture_generee'].includes(d.statut),
  },
  {
    key: 'transit',
    label: 'En transit',
    icon: '🚛',
    statuts: ['en_transit'],
    reached: d => ['en_transit','livre'].includes(d.statut),
  },
  {
    key: 'livre',
    label: 'Livré',
    icon: '📦',
    statuts: ['livre'],
    reached: d => d.statut === 'livre',
  },
];

const isCurrent = (step: Step, d: Dossier) =>
  step.statuts.includes(d.statut) || (step.key === 'transit' && !!d.transporteur_id && d.statut !== 'livre');

const stepDate = (step: Step, d: Dossier): string | null => {
  if (!step.reached(d)) return null;
  if (step.key === 'paye'    && d.paye_le)     return fmtDate(d.paye_le);
  if (step.key === 'demande' && d.created_at)  return fmtDate(d.created_at);
  return null;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

interface Props { dossier: Dossier }

export default function StatusTimeline({ dossier }: Props) {
  return (
    <div style={{ padding: '8px 0' }}>
      {STEPS.map((step, i) => {
        const done    = step.reached(dossier) && !isCurrent(step, dossier);
        const current = isCurrent(step, dossier);
        const pending = !step.reached(dossier);
        const last    = i === STEPS.length - 1;

        const circleColor = done    ? '#155724'
                          : current ? '#1B4F72'
                          : '#cccccc';
        const circleText  = done ? '✓' : step.icon;

        return (
          <div key={step.key} style={{ display: 'flex', gap: 16, position: 'relative' }}>
            {/* Colonne icône + ligne verticale */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: circleColor,
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 16 : 18,
                fontWeight: done ? 700 : 'normal',
                boxShadow: current ? '0 0 0 3px rgba(27,79,114,.25)' : 'none',
                flexShrink: 0,
              }}>
                {circleText}
              </div>
              {!last && (
                <div style={{
                  width: 2,
                  flex: 1,
                  minHeight: 32,
                  background: done ? '#155724' : '#e0e0e0',
                  margin: '4px 0',
                }} />
              )}
            </div>

            {/* Texte */}
            <div style={{ paddingBottom: last ? 0 : 24, paddingTop: 6 }}>
              <div style={{
                fontWeight: current ? 700 : pending ? 400 : 600,
                fontSize: 14,
                color: pending ? '#aaa' : current ? '#1B4F72' : '#333',
              }}>
                {step.label}
                {current && (
                  <span style={{
                    marginLeft: 8,
                    padding: '2px 8px',
                    background: '#1B4F72',
                    color: '#fff',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    En cours
                  </span>
                )}
              </div>
              {stepDate(step, dossier) && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {stepDate(step, dossier)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
