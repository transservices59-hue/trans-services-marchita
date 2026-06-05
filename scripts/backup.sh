#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup.sh — Backup manuel Supabase (Trans Services Marchita)
# Usage : ./scripts/backup.sh
# Prérequis : pg_dump installé, SUPABASE_DB_URL défini dans .env
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Charger les variables d'environnement ─────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # Exporter uniquement les variables sans commentaires
  set -a
  # shellcheck disable=SC1090
  source <(grep -v '^#' "$ROOT_DIR/.env" | grep -v '^\s*$')
  set +a
fi

# ── Configuration ─────────────────────────────────────────────────────────────
SUPABASE_PROJECT="pswfnmgfpkqeuawguiey"
# Format direct Supabase : postgresql://postgres.[project]:[password]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
DB_URL="${SUPABASE_DB_URL:-}"

BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="${BACKUP_DIR}/tsm_backup_${TIMESTAMP}.sql"
FILENAME_GZ="${FILENAME}.gz"

# ── Vérifications ─────────────────────────────────────────────────────────────

if ! command -v pg_dump &>/dev/null; then
  echo "❌ pg_dump non trouvé. Installez postgresql-client :"
  echo "   brew install libpq && export PATH=\$(brew --prefix libpq)/bin:\$PATH"
  exit 1
fi

if [[ -z "$DB_URL" ]]; then
  echo "❌ SUPABASE_DB_URL manquant dans .env"
  echo ""
  echo "   Ajoutez dans votre .env :"
  echo "   SUPABASE_DB_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
  echo ""
  echo "   Récupérez le mot de passe dans :"
  echo "   Supabase Dashboard > Settings > Database > Connection string"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# ── Backup ────────────────────────────────────────────────────────────────────

echo ""
echo "🔄 Backup Trans Services Marchita"
echo "   Projet    : ${SUPABASE_PROJECT}"
echo "   Horodatage: ${TIMESTAMP}"
echo "   Fichier   : ${FILENAME_GZ}"
echo ""

pg_dump \
  --no-owner \
  --no-acl \
  --schema=public \
  --format=plain \
  --no-password \
  "$DB_URL" \
  | gzip \
  > "$FILENAME_GZ"

SIZE=$(du -sh "$FILENAME_GZ" | cut -f1)
echo "✅ Backup terminé"
echo "   Taille : ${SIZE}"
echo "   Fichier: ${FILENAME_GZ}"
echo ""

# ── Nettoyage automatique (garder les 10 derniers backups) ────────────────────

BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/tsm_backup_*.sql.gz 2>/dev/null | wc -l)
if [[ $BACKUP_COUNT -gt 10 ]]; then
  echo "🧹 Nettoyage : suppression des backups > 10 (${BACKUP_COUNT} trouvés)…"
  ls -1t "${BACKUP_DIR}"/tsm_backup_*.sql.gz | tail -n +11 | xargs rm -f
  echo "   ✅ Backups anciens supprimés"
fi

echo ""
echo "📋 Liste des backups disponibles :"
ls -lh "${BACKUP_DIR}"/tsm_backup_*.sql.gz 2>/dev/null | awk '{print "   " $5 "  " $9}' || echo "   (aucun)"
echo ""
