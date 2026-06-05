import { Link } from 'react-router-dom';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff', border: '#dde3ea', text: '#333' };

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, color: C.primary, borderBottom: `2px solid ${C.primary}`,
      paddingBottom: 8, marginBottom: 16 }}>{title}</h2>
    <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8 }}>{children}</div>
  </section>
);

const Art = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: C.primary, marginBottom: 8 }}>
      Article {n} — {title}
    </h3>
    <div style={{ fontSize: 14, color: '#444', lineHeight: 1.8 }}>{children}</div>
  </div>
);

export default function LegalPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Nav */}
      <header style={{ background: C.primary, color: '#fff', padding: '0 2rem', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>
          🚚 Trans Services Marchita
        </Link>
        <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
          <Link to="/privacy" style={{ color: 'rgba(255,255,255,.8)' }}>Politique de confidentialité</Link>
          <Link to="/"        style={{ color: 'rgba(255,255,255,.8)' }}>Accueil</Link>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.primary, marginBottom: 6 }}>
          Mentions légales & CGV
        </h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 40 }}>
          Dernière mise à jour : juin 2026
        </p>

        {/* Sommaire */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '20px 24px', marginBottom: 40, fontSize: 14 }}>
          <div style={{ fontWeight: 700, color: C.primary, marginBottom: 10 }}>Sommaire</div>
          {[
            ['mentions','I. Mentions légales'],['cgv','II. Conditions générales de vente'],
            ['responsabilite','III. Responsabilité du transporteur'],['paiement','IV. Prix et paiement'],
            ['remboursement','V. Réclamations et remboursements'],['droit','VI. Droit applicable'],
          ].map(([id, label]) => (
            <div key={id} style={{ marginBottom: 4 }}>
              <a href={`#${id}`} style={{ color: C.accent, textDecoration: 'none' }}>→ {label}</a>
            </div>
          ))}
        </div>

        {/* I. Mentions légales */}
        <Section id="mentions" title="I. Mentions légales">
          <p><strong>Éditeur du site :</strong><br />
            Trans Services Marchita<br />
            Forme juridique : SARL (ou entreprise individuelle — à compléter)<br />
            SIRET : <em>à compléter</em><br />
            Adresse : 12 rue des Transports, 93200 Saint-Denis, France<br />
            Téléphone : +33 1 23 45 67 89<br />
            E-mail : contact@marchita-transport.fr<br />
            N° TVA intracommunautaire : <em>FR XX XXX XXX XXX — à compléter</em>
          </p>
          <p style={{ marginTop: 12 }}><strong>Directeur de la publication :</strong> Gérant de Trans Services Marchita</p>
          <p style={{ marginTop: 12 }}>
            <strong>Hébergeur :</strong><br />
            Vercel Inc.<br />
            340 Pine Street, Suite 701, San Francisco, CA 94104, USA<br />
            <a href="https://vercel.com" style={{ color: C.accent }}>vercel.com</a>
          </p>
          <p style={{ marginTop: 12 }}>
            <strong>Base de données :</strong><br />
            Supabase Inc., 970 Toa Payoh North, #07-04, Singapour 318992<br />
            <a href="https://supabase.com" style={{ color: C.accent }}>supabase.com</a>
          </p>
          <p style={{ marginTop: 12 }}>
            <strong>Paiement sécurisé :</strong> Stripe Payments Europe Ltd, 1 Grand Canal Street Lower, Dublin 2, Irlande.
            Certifié PCI DSS niveau 1. Trans Services Marchita ne stocke aucune donnée bancaire.
          </p>
          <p style={{ marginTop: 12 }}>
            <strong>Propriété intellectuelle :</strong> L'ensemble du contenu de ce site (textes, images, logotype)
            est protégé par le droit d'auteur. Toute reproduction sans autorisation préalable est interdite.
          </p>
        </Section>

        {/* II. CGV */}
        <Section id="cgv" title="II. Conditions générales de vente — Transport international France → Maroc">

          <Art n="1" title="Objet et champ d'application">
            <p>Les présentes conditions générales de vente (CGV) régissent les prestations de transport
            de marchandises effectuées par Trans Services Marchita (ci-après « le Transporteur »)
            entre la France et le Maroc.</p>
            <p style={{ marginTop: 8 }}>Elles s'appliquent à toute commande passée via la plateforme
            <strong> trans-services-marchita.vercel.app</strong> ou <strong>app.transservices.fr</strong>.
            La validation du devis et le paiement valent acceptation sans réserve des présentes CGV.</p>
            <p style={{ marginTop: 8 }}>Le transport international est soumis à la{' '}
            <strong>Convention relative au contrat de transport international de marchandises par route
            (CMR)</strong>, signée à Genève le 19 mai 1956, ainsi qu'aux lois française et marocaine
            applicables.</p>
          </Art>

          <Art n="2" title="Formation du contrat de transport">
            <p>Le contrat de transport est formé à la date de validation du paiement par le client.
            Un dossier numéroté est créé et une confirmation envoyée par e-mail.</p>
            <p style={{ marginTop: 8 }}>Le devis est valable <strong>30 jours</strong> à compter de sa date d'émission.
            Passé ce délai, un nouveau devis doit être demandé.</p>
            <p style={{ marginTop: 8 }}>La prise en charge physique de la marchandise nécessite la présentation
            d'une pièce d'identité et de la lettre de voiture CMR générée par le système.</p>
          </Art>

          <Art n="3" title="Obligations du client (expéditeur)">
            <ul style={{ paddingLeft: 20 }}>
              <li>Fournir des informations exactes sur la nature, le poids, les dimensions et la valeur de la marchandise.</li>
              <li>Emballer et conditionner la marchandise de façon à la protéger pendant le transport.</li>
              <li>S'assurer que la marchandise est conforme à la réglementation douanière franco-marocaine.</li>
              <li>Déclarer toute marchandise sensible, fragile ou de valeur élevée (&gt; 1 500 €).</li>
              <li>Être présent ou représenté lors de la prise en charge et de la livraison.</li>
            </ul>
          </Art>

          <Art n="4" title="Marchandises interdites ou soumises à déclaration spéciale">
            <p>Sont <strong>interdits de transport</strong> : explosifs, armes, stupéfiants, produits
            biologiques dangereux, billets de banque, pierres et métaux précieux non déclarés,
            animaux vivants, denrées périssables sans accord préalable.</p>
            <p style={{ marginTop: 8 }}>Sont soumis à <strong>déclaration spéciale</strong> et surcoût tarifaire :
            électronique de valeur, œuvres d'art, médicaments, alcools et tabacs.</p>
            <p style={{ marginTop: 8 }}>Le Transporteur se réserve le droit de refuser ou d'ouvrir les colis
            suspects et d'aviser les autorités douanières compétentes.</p>
          </Art>
        </Section>

        {/* III. Responsabilité */}
        <Section id="responsabilite" title="III. Responsabilité du transporteur">
          <Art n="5" title="Délais de livraison">
            <p>Les délais indiqués (5 à 15 jours ouvrables) sont <strong>purement indicatifs</strong>
            et ne constituent pas un engagement contractuel. Ils peuvent être allongés par des
            opérations de dédouanement, des conditions météorologiques ou des formalités administratives.</p>
            <p style={{ marginTop: 8 }}>Aucun remboursement ne pourra être réclamé pour un retard de livraison,
            sauf accord écrit préalable stipulant un délai garanti avec pénalité.</p>
          </Art>

          <Art n="6" title="Limitation de responsabilité (CMR Article 23)">
            <p>Conformément à l'article 23 de la Convention CMR, la responsabilité du transporteur
            en cas de perte totale ou partielle est limitée à <strong>8,33 DTS (Droits de Tirage Spéciaux)
            par kilogramme</strong> de poids brut manquant.</p>
            <p style={{ marginTop: 8 }}>En cas de dommage, l'indemnité ne peut dépasser le montant
            qui aurait été dû en cas de perte totale. La responsabilité du transporteur ne couvre pas :</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Les dommages résultant d'un emballage insuffisant par l'expéditeur.</li>
              <li>Les pertes résultant d'un cas de force majeure.</li>
              <li>Les pertes résultant d'un vice propre de la marchandise.</li>
              <li>Les préjudices indirects (manque à gagner, perte de clientèle).</li>
            </ul>
            <p style={{ marginTop: 8 }}>Pour une protection supérieure, le client est invité à souscrire
            une assurance marchandise complémentaire.</p>
          </Art>

          <Art n="7" title="Réserves à la livraison">
            <p>Toute réserve concernant l'état de la marchandise doit être formulée par écrit
            (<strong>lettre recommandée avec AR</strong>) dans les <strong>7 jours</strong> suivant la livraison
            (CMR Article 30). Passé ce délai, la marchandise est réputée reçue conforme.</p>
          </Art>
        </Section>

        {/* IV. Prix et paiement */}
        <Section id="paiement" title="IV. Prix et conditions de paiement">
          <Art n="8" title="Tarification">
            <p>Les prix sont exprimés en euros TTC (TVA 20 % incluse) et s'entendent pour un transport
            standard de porte à dépôt ou dépôt à dépôt. Les tarifs sont ceux figurant sur le devis accepté.</p>
            <p style={{ marginTop: 8 }}>Des suppléments peuvent s'appliquer pour : livraison à domicile,
            reprise en cas d'absence, stockage temporaire, dédouanement complexe.</p>
          </Art>

          <Art n="9" title="Paiement">
            <p>Le paiement est exigible <strong>intégralement avant toute prise en charge de la marchandise</strong>
            via la plateforme sécurisée Stripe (carte bancaire). Aucun escompte n'est consenti pour paiement anticipé.</p>
            <p style={{ marginTop: 8 }}>Conformément à l'article L.441-10 du Code de commerce,
            tout retard de paiement entraîne des pénalités au <strong>taux légal multiplié par 3</strong>,
            ainsi qu'une indemnité forfaitaire pour frais de recouvrement de <strong>40 €</strong>.</p>
          </Art>
        </Section>

        {/* V. Réclamations */}
        <Section id="remboursement" title="V. Réclamations et remboursements">
          <Art n="10" title="Politique de réclamation">
            <p>Toute réclamation doit être adressée à <strong>contact@marchita-transport.fr</strong>
            dans les délais CMR applicables. Le dossier numéroté et les photos éventuelles doivent
            être joints à la réclamation.</p>
          </Art>
          <Art n="11" title="Politique de remboursement">
            <p>En cas d'<strong>annulation avant prise en charge</strong> : remboursement intégral sous 5–10 jours ouvrables,
            déduction faite des frais bancaires Stripe non remboursables (1,4 % + 0,25 €).</p>
            <p style={{ marginTop: 8 }}>En cas d'<strong>annulation après prise en charge</strong> :
            aucun remboursement des frais engagés pour le transport déjà effectué.</p>
            <p style={{ marginTop: 8 }}>En cas de <strong>perte ou dommage avéré</strong> :
            indemnisation dans les limites de responsabilité CMR Article 23, après enquête contradictoire.</p>
          </Art>
        </Section>

        {/* VI. Droit applicable */}
        <Section id="droit" title="VI. Droit applicable et tribunaux compétents">
          <Art n="12" title="Loi applicable">
            <p>Les présentes CGV sont régies par le droit français et la Convention CMR.
            Pour les litiges relatifs aux dommages aux marchandises, la Convention CMR prime.</p>
          </Art>
          <Art n="13" title="Règlement des litiges">
            <p>En cas de litige, les parties s'engagent à rechercher une solution amiable.
            À défaut, le tribunal compétent sera le <strong>Tribunal de Commerce de Bobigny (93)</strong>
            ou tout autre tribunal désigné par la loi applicable.</p>
            <p style={{ marginTop: 8 }}>Les consommateurs résidant dans l'UE peuvent également saisir
            la plateforme de règlement en ligne des litiges :{' '}
            <a href="https://ec.europa.eu/consumers/odr" style={{ color: C.accent }}>
              ec.europa.eu/consumers/odr
            </a>
            </p>
          </Art>
        </Section>

        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
          padding: '16px 20px', fontSize: 13, color: '#856404' }}>
          ⚠️ <strong>Note :</strong> Ces CGV sont fournies à titre indicatif et doivent être validées
          par un avocat spécialisé en droit du transport international avant mise en production commerciale.
          Les numéros SIRET, TVA et coordonnées exactes doivent être complétés.
        </div>
      </div>

      <footer style={{ background: C.primary, color: 'rgba(255,255,255,.7)', textAlign: 'center',
        padding: '20px', fontSize: 12, marginTop: 40 }}>
        © {new Date().getFullYear()} Trans Services Marchita ·{' '}
        <Link to="/privacy" style={{ color: '#E67E22' }}>Politique de confidentialité</Link> ·{' '}
        <Link to="/" style={{ color: 'rgba(255,255,255,.7)' }}>Accueil</Link>
      </footer>
    </div>
  );
}
