# Procédure de Backup & Restauration — Trans Services Marchita

## Backup automatique (Supabase Pro)

Sur le plan Pro, Supabase propose le **Point-in-Time Recovery (PITR)** :
- Rétention : jusqu'à 7 jours (Pro) ou 30 jours (Enterprise)
- Activation : Dashboard Supabase > Project Settings > Add-Ons > Point in Time Recovery
- Restauration : contactez le support Supabase ou via la CLI

## Backup manuel (plan Hobby / Free)

### Prérequis

```bash
# macOS
brew install libpq
export PATH="$(brew --prefix libpq)/bin:$PATH"

# Ubuntu/Debian
sudo apt-get install -y postgresql-client
```

### Configuration

Ajoutez dans votre `.env` :

```env
SUPABASE_DB_URL=postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
```

Récupérez le mot de passe dans :  
**Supabase Dashboard → Settings → Database → Connection string (Transaction pooler)**

### Lancer un backup

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

Les fichiers sont stockés dans `./backups/tsm_backup_YYYYMMDD_HHMMSS.sql.gz`.  
Les 10 derniers backups sont conservés automatiquement.

### Automatisation (cron macOS)

```bash
# Backup quotidien à 3h du matin
crontab -e
# Ajouter :
0 3 * * * /path/to/trans-services-marchita/scripts/backup.sh >> /tmp/tsm-backup.log 2>&1
```

---

## Restauration

### 1. Identifier le backup à restaurer

```bash
ls -lh backups/
```

### 2. Restaurer sur une base de test (RECOMMANDÉ avant production)

```bash
# Créer une base de test dans Supabase (Dashboard > New project)
TEST_DB_URL="postgresql://postgres.[TEST_PROJECT]:[PASSWORD]@..."

# Décompresser et restaurer
gunzip -c backups/tsm_backup_20260101_030000.sql.gz | psql "$TEST_DB_URL"
```

### 3. Vérification post-restauration

```sql
-- Dans le SQL Editor de la base restaurée
SELECT COUNT(*) FROM dossiers;
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM factures;
SELECT MAX(created_at) FROM audit_logs;
```

### 4. Restaurer en production (⚠️ IRREVERSIBLE)

```bash
# ATTENTION : efface toutes les données actuelles
# Toujours tester sur une base de test d'abord

PROD_DB_URL="postgresql://postgres.[PROD_PROJECT]:[PASSWORD]@..."

# Vider le schéma public
psql "$PROD_DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restaurer
gunzip -c backups/tsm_backup_YYYYMMDD_HHMMSS.sql.gz | psql "$PROD_DB_URL"
```

---

## RLS & migrations post-restauration

Après une restauration complète, réappliquer les migrations dans l'ordre :

```bash
# Vérifier que toutes les migrations sont présentes
ls supabase/migrations/

# Ré-exécuter si nécessaire dans le SQL Editor Supabase :
# 001_initial_schema.sql
# 002_storage_indexes.sql
# 003_audit_rls.sql
# 004_automation.sql
# 005_indexes_extra.sql
```

---

## Contacts en cas d'incident

- Support Supabase : https://supabase.com/support
- Status Supabase : https://status.supabase.com
- Status Vercel : https://vercel-status.com
