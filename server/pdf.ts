import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPA_SERVICE_KEY ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── Constantes de style ────────────────────────────────────────────────────────
const PRIMARY  = '#1B4F72';
const ACCENT   = '#E67E22';
const TEXT     = '#333333';
const LIGHT    = '#888888';
const SUCCESS  = '#155724';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DevisItem  { label: string; montant: number }
interface FactureRow { numero: string; montant_ht: number; tva: number; montant_ttc: number; pdf_url: string | null }

interface DossierFull {
  id: string;
  numero: string;
  created_at: string;
  type_colis: string;
  description: string;
  poids_kg: number | null;
  volume_m3: number | null;
  adresse_depart: string;
  adresse_arrivee: string;
  montant_devis: number | null;
  paye_le: string | null;
  stripe_payment_intent_id: string | null;
  client: { nom: string; prenom: string; email: string; telephone: string } | null;
  devis_items: DevisItem[];
  factures: FactureRow[];
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

function rule(doc: PDFKit.PDFDocument, y: number, color = '#DDDDDD', w = 1) {
  doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(w).stroke();
}

// ── Header commun ─────────────────────────────────────────────────────────────

function header(doc: PDFKit.PDFDocument): void {
  doc.font('Helvetica-Bold').fontSize(16).fillColor(PRIMARY)
     .text('TRANS SERVICES MARCHITA', 50, 50);
  doc.font('Helvetica').fontSize(8.5).fillColor(LIGHT)
     .text('Transport France → Maroc  •  Rapide, Fiable, Sécurisé', 50, 70);

  // Coordonnées (droite)
  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT)
     .text('12 rue des Transports, 93200 Saint-Denis', 350, 50, { align: 'right', width: 195 })
     .text('Tél : +33 1 23 45 67 89', 350, 62,  { align: 'right', width: 195 })
     .text('contact@marchita-transport.fr', 350, 74, { align: 'right', width: 195 });

  doc.moveTo(50, 96).lineTo(545, 96).strokeColor(PRIMARY).lineWidth(2.5).stroke();
}

// ── Blocs d'info ──────────────────────────────────────────────────────────────

function clientBox(doc: PDFKit.PDFDocument, d: DossierFull, y: number): number {
  // Client (gauche)
  doc.rect(50, y, 230, 78).fillColor('#F0F4F8').fill();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(PRIMARY).text('CLIENT', 60, y + 7);
  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT)
     .text(`${d.client?.prenom ?? ''} ${d.client?.nom ?? '—'}`, 60, y + 20)
     .text(d.client?.email ?? '',      60, y + 33)
     .text(d.client?.telephone ?? '',  60, y + 46);

  // Envoi (droite)
  doc.rect(315, y, 230, 78).fillColor('#F0F4F8').fill();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(PRIMARY).text('EXPÉDITION', 325, y + 7);
  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT)
     .text(`Type : ${d.type_colis.toUpperCase()}`, 325, y + 20)
     .text(`Départ   : ${d.adresse_depart}`,  325, y + 33, { width: 210 })
     .text(`Arrivée  : ${d.adresse_arrivee}`, 325, y + 51, { width: 210 });

  return y + 92;
}

function colisSection(doc: PDFKit.PDFDocument, d: DossierFull, y: number): number {
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(PRIMARY).text('DÉTAIL DE L\'ENVOI', 50, y);
  y += 13; rule(doc, y, PRIMARY, 0.8); y += 8;

  const lines: string[] = [];
  if (d.poids_kg)  lines.push(`Poids estimé : ${d.poids_kg} kg`);
  if (d.volume_m3) lines.push(`Volume estimé : ${d.volume_m3} m³`);
  if (d.description) lines.push(`Description : ${d.description}`);

  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT);
  lines.forEach(l => { doc.text(l, 60, y); y += 13; });
  return y + 8;
}

// ── Tableau de prix ───────────────────────────────────────────────────────────

function priceTable(doc: PDFKit.PDFDocument, items: DevisItem[], ht: number, y: number): number {
  // En-tête tableau
  doc.rect(50, y, 495, 20).fillColor(PRIMARY).fill();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
     .text('Désignation', 58, y + 5)
     .text('Montant', 487, y + 5, { align: 'right', width: 50 });
  y += 20;

  const rows = items.length > 0 ? items : [{ label: 'Transport France → Maroc', montant: ht }];

  rows.forEach((item, i) => {
    doc.rect(50, y, 495, 18).fillColor(i % 2 === 0 ? '#FAFBFC' : '#FFFFFF').fill();
    doc.font('Helvetica').fontSize(8.5).fillColor(TEXT)
       .text(item.label, 58, y + 4, { width: 380 })
       .text(eur(item.montant), 487, y + 4, { align: 'right', width: 50 });
    y += 18;
  });

  rule(doc, y + 4); y += 14;

  const tva  = Math.round(ht * 0.20 * 100) / 100;
  const ttc  = Math.round((ht + tva) * 100) / 100;

  // HT + TVA
  for (const [label, val] of [['Montant HT', eur(ht)], ['TVA (20 %)', eur(tva)]] as const) {
    doc.font('Helvetica').fontSize(9).fillColor(TEXT)
       .text(label, 360, y, { width: 124, align: 'right' })
       .text(val,   487, y, { width: 50,  align: 'right' });
    y += 15;
  }

  // TTC highlight
  doc.rect(340, y - 2, 205, 20).fillColor(PRIMARY).fill();
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF')
     .text('TOTAL TTC', 350, y + 2, { width: 124, align: 'right' })
     .text(eur(ttc), 487, y + 2, { width: 50, align: 'right' });
  y += 28;

  return y;
}

// ── Footer légal ──────────────────────────────────────────────────────────────

function footer(doc: PDFKit.PDFDocument): void {
  rule(doc, 782, LIGHT);
  doc.font('Helvetica').fontSize(6.5).fillColor(LIGHT)
     .text(
       'Trans Services Marchita — Conditions : paiement intégral avant expédition. ' +
       'Délais indicatifs non contractuels. Responsabilité limitée à la valeur déclarée. ' +
       'En cas de litige : Tribunal de Commerce de Paris.',
       50, 788, { width: 495, align: 'center' }
     );
}

// ── Buffer générique ──────────────────────────────────────────────────────────

function mkBuffer(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   ()          => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc);
    doc.end();
  });
}

// ── Récupération dossier ──────────────────────────────────────────────────────

export async function fetchDossier(dossierId: string): Promise<DossierFull> {
  const { data, error } = await supabase
    .from('dossiers')
    .select('*, client:profiles(*), devis_items(*), factures(*)')
    .eq('id', dossierId)
    .single();
  if (error || !data) throw new Error(`Dossier introuvable : ${error?.message ?? 'non trouvé'}`);
  return data as unknown as DossierFull;
}

// ── API : Devis PDF ───────────────────────────────────────────────────────────

export async function buildDevisPDF(dossierId: string): Promise<Buffer> {
  const d      = await fetchDossier(dossierId);
  const date   = dateFr(d.created_at);
  const expire = dateFr(new Date(+new Date(d.created_at) + 30 * 86_400_000).toISOString());

  return mkBuffer(doc => {
    header(doc);

    let y = 115;
    doc.font('Helvetica-Bold').fontSize(20).fillColor(PRIMARY).text('DEVIS', 50, y);
    doc.font('Helvetica').fontSize(8.5).fillColor(TEXT)
       .text(`N° ${d.numero}`,          50, y + 25)
       .text(`Date : ${date}`,          50, y + 38)
       .text(`Valable jusqu'au : ${expire}`, 50, y + 51);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT)
       .text('EN ATTENTE DE VALIDATION', 400, y + 38, { align: 'right', width: 145 });

    y += 70;
    y = clientBox(doc, d, y);
    y = colisSection(doc, d, y);
    y = priceTable(doc, d.devis_items, d.montant_devis ?? 0, y);

    y += 8;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(PRIMARY).text('CONDITIONS', 50, y);
    y += 14;
    doc.font('Helvetica').fontSize(8).fillColor(TEXT)
       .text('• Devis valable 30 jours à compter de la date d\'émission', 58, y)
       .text('• Paiement intégral requis avant toute expédition',          58, y + 12)
       .text('• Délai de livraison indicatif : 5 à 15 jours ouvrables selon destination', 58, y + 24);

    footer(doc);
  });
}

// ── API : Facture PDF ─────────────────────────────────────────────────────────

export async function buildFacturePDF(dossierId: string): Promise<Buffer> {
  const d       = await fetchDossier(dossierId);
  const facture = d.factures?.[0];
  if (!facture) throw new Error('Aucune facture générée pour ce dossier');

  const date     = dateFr(d.created_at);
  const datePaye = d.paye_le ? dateFr(d.paye_le) : '—';

  return mkBuffer(doc => {
    header(doc);

    let y = 115;
    doc.font('Helvetica-Bold').fontSize(20).fillColor(PRIMARY).text('FACTURE', 50, y);
    doc.font('Helvetica').fontSize(8.5).fillColor(TEXT)
       .text(`N° ${facture.numero}`,          50, y + 25)
       .text(`Date émission : ${date}`,        50, y + 38)
       .text(`Date paiement : ${datePaye}`,    50, y + 51);
    if (d.stripe_payment_intent_id) {
      doc.text(`Réf. Stripe : ${d.stripe_payment_intent_id}`, 50, y + 64);
    }

    // Tampon PAYÉ (rotated)
    doc.save();
    doc.translate(465, y + 38).rotate(-22, { origin: [0, 0] });
    doc.rect(-44, -16, 88, 32).strokeColor(SUCCESS).lineWidth(2.5).stroke();
    doc.font('Helvetica-Bold').fontSize(16).fillColor(SUCCESS)
       .text('PAYÉ', -44, -11, { width: 88, align: 'center' });
    doc.restore();

    y += 80;
    y = clientBox(doc, d, y);
    y = colisSection(doc, d, y);

    const items = d.devis_items.length > 0
      ? d.devis_items
      : [{ label: 'Transport France → Maroc', montant: facture.montant_ht }];

    y = priceTable(doc, items, facture.montant_ht, y);

    y += 8;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(PRIMARY)
       .text('INFORMATIONS DE PAIEMENT', 50, y);
    y += 14;
    doc.font('Helvetica').fontSize(8.5).fillColor(TEXT)
       .text(`Paiement reçu le ${datePaye}. Merci de votre confiance.`, 58, y);

    footer(doc);
  });
}

// ── Upload Supabase Storage ───────────────────────────────────────────────────

export async function storePDF(
  buffer: Buffer,
  dossierId: string,
  type: 'devis' | 'facture',
): Promise<string> {
  const path = `${dossierId}/${type}-${Date.now()}.pdf`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });

  if (error) {
    console.error(`[pdf] Storage upload failed : ${error.message}`);
    return '';
  }

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 3600);

  const url = data?.signedUrl ?? '';

  if (type === 'facture' && url) {
    await supabase.from('factures').update({ pdf_url: url }).eq('dossier_id', dossierId);
  }

  return url;
}
