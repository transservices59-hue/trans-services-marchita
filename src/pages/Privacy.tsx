import { Link } from 'react-router-dom';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff', border: '#dde3ea' };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, color: C.primary,
      borderBottom: `2px solid ${C.primary}`, paddingBottom: 8, marginBottom: 16 }}>
      {title}
    </h2>
    <div style={{ fontSize: 14, color: '#444', lineHeight: 1.8 }}>{children}</div>
  </section>
);

const Table = ({ rows }: { rows: [string, string][] }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12 }}>
    <tbody>
      {rows.map(([label, value], i) => (
        <tr key={i} style={{ background: i % 2 === 0 ? '#f8f9fb' : C.white }}>
          <td style={{ padding: '9px 14px', fontWeight: 600, color: '#444',
            borderBottom: `1px solid ${C.border}`, width: '35%' }}>{label}</td>
          <td style={{ padding: '9px 14px', borderBottom: `1px solid ${C.border}` }}>{value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <header style={{ background: C.primary, color: '#fff', padding: '0 2rem', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>
          🚚 Trans Services Marchita
        </Link>
        <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
          <Link to="/legal"   style={{ color: 'rgba(255,255,255,.8)' }}>CGV</Link>
          <Link to="/"        style={{ color: 'rgba(255,255,255,.8)' }}>Accueil</Link>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.primary, marginBottom: 6 }}>
          Politique de confidentialité (RGPD)
        </h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 40 }}>
          Dernière mise à jour : juin 2026 · Conformément au Règlement (UE) 2016/679 (RGPD)
        </p>

        <Section title="1. Responsable du traitement">
          <p><strong>Trans Services Marchita</strong><br />
            12 rue des Transports, 93200 Saint-Denis, France<br />
            E-mail DPO / contact RGPD : <a href="mailto:rgpd@marchita-transport.fr"
              style={{ color: C.accent }}>rgpd@marchita-transport.fr</a>
          </p>
        </Section>

        <Section title="2. Données collectées et finalités">
          <p>Nous collectons uniquement les données strictement nécessaires à l'exécution de nos services.</p>
          <Table rows={[
            ['Données d\'identification','Nom, prénom, e-mail, téléphone — fournis lors de la création de compte ou d\'une demande.'],
            ['Données d\'expédition','Adresses de départ et d\'arrivée, description et poids de la marchandise.'],
            ['Données financières','Référence de transaction Stripe (identifiant de paiement). Aucune donnée bancaire n\'est stockée par nos soins.'],
            ['Données de localisation','Positions GPS des transporteurs (transit uniquement, durée limitée).'],
            ['Données de navigation','Journaux d\'accès serveur (IP, horodatage, requête). Cookies de session essentiels.'],
            ['Communications','E-mails échangés dans le cadre du service client.'],
          ]} />
          <p style={{ marginTop: 16 }}><strong>Finalités :</strong> exécution du contrat de transport,
          facturation, communication client, amélioration du service, obligations légales (comptabilité,
          douane).</p>
        </Section>

        <Section title="3. Durée de conservation">
          <Table rows={[
            ['Compte client actif','Durée de la relation commerciale + 3 ans après dernière connexion.'],
            ['Dossiers et factures','10 ans (obligation comptable légale, article L.123-22 Code de commerce).'],
            ['Logs GPS (transporteurs)','30 jours glissants (seules les 5 dernières positions conservées après 30 j).'],
            ['Journaux d\'audit','90 jours.'],
            ['Logs serveur','90 jours.'],
            ['Après suppression de compte','Données anonymisées immédiatement. Références comptables conservées 10 ans.'],
          ]} />
        </Section>

        <Section title="4. Vos droits (RGPD Art. 15 à 22)">
          <p>Vous disposez des droits suivants concernant vos données personnelles :</p>
          <ul style={{ paddingLeft: 20 }}>
            <li><strong>Accès (Art. 15) :</strong> obtenir une copie de vos données.</li>
            <li><strong>Rectification (Art. 16) :</strong> corriger des données inexactes.</li>
            <li><strong>Effacement (Art. 17) :</strong> supprimer votre compte et données personnelles
              (sous réserve des obligations de conservation comptable).</li>
            <li><strong>Portabilité (Art. 20) :</strong> recevoir vos données dans un format lisible par machine.</li>
            <li><strong>Opposition (Art. 21) :</strong> vous opposer à certains traitements.</li>
            <li><strong>Limitation (Art. 18) :</strong> restreindre le traitement dans certains cas.</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            Pour exercer vos droits : <a href="mailto:rgpd@marchita-transport.fr" style={{ color: C.accent }}>
              rgpd@marchita-transport.fr
            </a> (réponse sous 30 jours).<br />
            En cas de non-réponse, vous pouvez saisir la <strong>CNIL</strong> :{' '}
            <a href="https://www.cnil.fr" style={{ color: C.accent }}>cnil.fr</a>
          </p>
          <div style={{ background: '#d4edda', borderRadius: 8, padding: '12px 16px', marginTop: 16, fontSize: 13 }}>
            🗑️ <strong>Supprimer mon compte :</strong> Connectez-vous, accédez à votre profil
            et cliquez sur « Supprimer mon compte ». Vos données personnelles seront anonymisées
            immédiatement. Les dossiers sont conservés 10 ans pour obligations comptables.
          </div>
        </Section>

        <Section title="5. Destinataires des données">
          <p>Vos données sont traitées par Trans Services Marchita et transmises uniquement aux :</p>
          <Table rows={[
            ['Transporteurs partenaires','Uniquement les données nécessaires à l\'exécution de votre livraison.'],
            ['Stripe (paiement)','Données de transaction pour traitement du paiement. Certifié PCI DSS Niveau 1.'],
            ['Supabase (base de données)','Infrastructure cloud sécurisée. Données stockées en UE (région eu-west).'],
            ['Vercel (hébergement)','Serveurs en région US-East. Standard Contractual Clauses (SCC) applicables.'],
            ['Brevo (e-mails)','Envoi d\'e-mails transactionnels. Siège en France.'],
          ]} />
          <p style={{ marginTop: 12 }}>Aucune donnée n'est vendue ou partagée à des fins publicitaires.</p>
        </Section>

        <Section title="6. Transferts hors Union Européenne">
          <p>Vercel et Stripe opèrent depuis les États-Unis. Ces transferts sont encadrés par les
          <strong> Clauses Contractuelles Types (CCT)</strong> de la Commission européenne,
          conformément à l'article 46 RGPD.</p>
        </Section>

        <Section title="7. Cookies">
          <p>Nous n'utilisons que des cookies <strong>strictement essentiels</strong> au fonctionnement :</p>
          <Table rows={[
            ['Cookie de session Supabase','Authentification. Durée : session navigateur.'],
            ['Préférence cookies (tsm_cookie_consent)','Mémorisation de votre choix. Durée : 12 mois.'],
          ]} />
          <p style={{ marginTop: 12 }}>Aucun cookie de tracking ou publicitaire n'est déposé sans votre
          consentement explicite.</p>
        </Section>

        <Section title="8. Sécurité">
          <p>Mesures en place :</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Chiffrement TLS 1.3 sur toutes les communications.</li>
            <li>Mots de passe hachés (bcrypt via Supabase Auth).</li>
            <li>Double authentification (2FA) pour les comptes administrateurs.</li>
            <li>Journaux d'audit de toutes les modifications sensibles.</li>
            <li>Accès base de données restreint par Row Level Security (RLS).</li>
            <li>Clés Stripe et Supabase jamais exposées côté client.</li>
          </ul>
        </Section>

        <Section title="9. Modifications">
          <p>Cette politique peut être mise à jour. En cas de modification substantielle, les clients
          enregistrés seront informés par e-mail au moins 15 jours à l'avance.</p>
        </Section>
      </div>

      <footer style={{ background: C.primary, color: 'rgba(255,255,255,.7)',
        textAlign: 'center', padding: '20px', fontSize: 12, marginTop: 40 }}>
        © {new Date().getFullYear()} Trans Services Marchita ·{' '}
        <Link to="/legal" style={{ color: '#E67E22' }}>CGV & Mentions légales</Link> ·{' '}
        <Link to="/" style={{ color: 'rgba(255,255,255,.7)' }}>Accueil</Link>
      </footer>
    </div>
  );
}
