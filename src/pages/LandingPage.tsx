import { useNavigate } from 'react-router-dom';
import { TARIFS_COLIS, TARIFS_ELECTROMENAGER } from '../lib/tarification';

const C = {
  primary: '#1B4F72',
  primaryDark: '#154360',
  accent: '#E67E22',
  accentLight: '#F39C12',
  bg: '#f5f7fa',
  white: '#fff',
  textLight: '#555',
  border: '#dde3ea',
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'inherit', background: C.bg, minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: C.primary, padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}>
        <span style={{ color: C.white, fontWeight: 700, fontSize: 20, letterSpacing: '-0.3px' }}>
          🚚 Trans Services Marchita
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent', border: `1.5px solid rgba(255,255,255,.6)`,
              color: C.white, padding: '8px 18px', borderRadius: 6, fontSize: 14,
            }}
          >
            Connexion
          </button>
          <button
            onClick={() => navigate('/demande')}
            style={{
              background: C.accent, border: 'none',
              color: C.white, padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
            }}
          >
            Faire une demande
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 60%, #2E86C1 100%)`,
        color: C.white, textAlign: 'center', padding: '100px 2rem 80px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 16, letterSpacing: 1 }}>
            🇫🇷 France &nbsp;→&nbsp; 🇲🇦 Maroc
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: 20 }}>
            Vos colis livrés en toute sérénité
          </h1>
          <p style={{ fontSize: 18, opacity: 0.9, marginBottom: 40, lineHeight: 1.6 }}>
            Transport de colis et électroménager de France vers le Maroc.<br />
            Devis rapide, paiement sécurisé, suivi GPS en temps réel.
          </p>
          <button
            onClick={() => navigate('/demande')}
            style={{
              background: C.accent, color: C.white,
              padding: '16px 40px', borderRadius: 8, fontSize: 18, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(230,126,34,.5)',
              transition: 'transform .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
          >
            Faire une demande gratuitement →
          </button>
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap', opacity: 0.85 }}>
            {['✅ Devis sous 24 h', '🔒 Paiement sécurisé', '📍 Suivi GPS'].map(f => (
              <span key={f} style={{ fontSize: 15 }}>{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section style={{ padding: '80px 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: C.primary, marginBottom: 12 }}>
          Comment ça marche ?
        </h2>
        <p style={{ textAlign: 'center', color: C.textLight, marginBottom: 56 }}>
          Expédier au Maroc en 4 étapes simples
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {[
            { num: '1', icon: '📦', title: 'Votre demande', desc: 'Renseignez le type de colis, son poids et les adresses de départ et d\'arrivée.' },
            { num: '2', icon: '💬', title: 'Réception du devis', desc: 'Notre équipe vous envoie un devis détaillé sous 24 h, sans engagement.' },
            { num: '3', icon: '💳', title: 'Paiement en ligne', desc: 'Validez votre devis et payez en toute sécurité via Stripe.' },
            { num: '4', icon: '📍', title: 'Suivi GPS', desc: 'Suivez votre colis en temps réel sur la carte jusqu\'à la livraison.' },
          ].map(step => (
            <div key={step.num} style={{
              background: C.white, borderRadius: 12, padding: '32px 24px', textAlign: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: C.primary,
                color: C.white, fontWeight: 700, fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>{step.num}</div>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{step.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: C.primary }}>{step.title}</h3>
              <p style={{ color: C.textLight, fontSize: 14, lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tarifs ── */}
      <section style={{ background: C.white, padding: '80px 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: C.primary, marginBottom: 12 }}>
            Nos tarifs
          </h2>
          <p style={{ textAlign: 'center', color: C.textLight, marginBottom: 56 }}>
            Prix indicatifs France → Maroc, tous frais compris
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 40 }}>

            {/* Colis */}
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: C.primary, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                📦 Colis & marchandises
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: C.primary, color: C.white }}>
                    {['Poids', 'Prix / kg', 'Minimum'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TARIFS_COLIS.map((t, i) => (
                    <tr key={t.label} style={{ background: i % 2 === 0 ? '#f8f9fb' : C.white }}>
                      <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>{t.label}</td>
                      <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.accent }}>
                        {t.prixKg.toFixed(2)} €/kg
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>{t.minimum} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Électroménager */}
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: C.primary, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                🏠 Électroménager
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: C.primary, color: C.white }}>
                    {['Appareil', 'Prix forfait'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TARIFS_ELECTROMENAGER.map((t, i) => (
                    <tr key={t.type} style={{ background: i % 2 === 0 ? '#f8f9fb' : C.white }}>
                      <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>{t.type}</td>
                      <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.accent }}>
                        {t.prix} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                * Tarifs indicatifs. Devis personnalisé sur demande pour les volumes importants.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA bas de page ── */}
      <section style={{
        background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentLight} 100%)`,
        color: C.white, textAlign: 'center', padding: '60px 2rem',
      }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>Prêt à expédier ?</h2>
        <p style={{ opacity: 0.9, marginBottom: 28, fontSize: 16 }}>
          Obtenez votre devis gratuit en moins de 2 minutes.
        </p>
        <button
          onClick={() => navigate('/demande')}
          style={{
            background: C.white, color: C.accent,
            padding: '14px 36px', borderRadius: 8, fontSize: 17, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(0,0,0,.15)',
          }}
        >
          Faire une demande →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: C.primaryDark, color: 'rgba(255,255,255,.85)', padding: '48px 2rem 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 40 }}>

          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: C.white }}>
              🚚 Trans Services Marchita
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.8 }}>
              Spécialiste du transport de colis<br />et d'électroménager entre la France<br />et le Maroc depuis 2015.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 12, color: C.white }}>Contact</div>
            <ul style={{ listStyle: 'none', fontSize: 14, lineHeight: 2, opacity: 0.85 }}>
              <li>📞 +33 1 23 45 67 89</li>
              <li>📱 +212 6 00 11 22 33</li>
              <li>✉️ contact@marchita-transport.fr</li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 12, color: C.white }}>Adresse</div>
            <address style={{ fontStyle: 'normal', fontSize: 14, lineHeight: 1.8, opacity: 0.85 }}>
              12 rue des Transports<br />
              93200 Saint-Denis, France<br />
              <br />
              Agence Maroc :<br />
              Avenue Mohammed V, Casablanca
            </address>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 12, color: C.white }}>Horaires</div>
            <ul style={{ listStyle: 'none', fontSize: 14, lineHeight: 2, opacity: 0.85 }}>
              <li>Lun – Ven : 9h – 18h</li>
              <li>Sam : 9h – 13h</li>
              <li>Dim : Fermé</li>
            </ul>
          </div>

        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.15)', marginTop: 40, paddingTop: 20, textAlign: 'center', fontSize: 13, opacity: 0.6 }}>
          © {new Date().getFullYear()} Trans Services Marchita — Tous droits réservés
        </div>
      </footer>

    </div>
  );
}
