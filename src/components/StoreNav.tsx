import { Link } from 'react-router-dom';

const LINKS = [
  { label: 'Dossiers',      to: '/store/dossiers'      },
  { label: 'Transporteurs', to: '/store/transporteurs' },
  { label: 'Carte GPS',     to: '/store/map'           },
  { label: 'Analytics',     to: '/store/analytics'     },
  { label: 'Audit',         to: '/store/audit'         },
];

export default function StoreNav({ active }: { active: string }) {
  return (
    <nav style={{ display: 'flex', gap: 4 }}>
      {LINKS.map(l => (
        <Link key={l.to} to={l.to} style={{
          color: 'rgba(255,255,255,.85)', fontSize: 14, padding: '6px 12px', borderRadius: 6,
          background: l.to === active ? 'rgba(255,255,255,.18)' : 'transparent',
          textDecoration: 'none',
        }}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
