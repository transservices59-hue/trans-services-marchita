# RLS Policies — Trans Services Marchita

## Architecture

Toutes les policies utilisent des **Security Definer functions** pour éviter
la récursion RLS (boucle infinie quand une policy interroge une table qui a
elle-même des policies).

### Fonctions utilitaires

| Fonction | Retourne | Description |
|---|---|---|
| `is_store()` | boolean | true si l'utilisateur a le rôle 'store' |
| `is_client()` | boolean | true si l'utilisateur a le rôle 'client' |
| `my_profile_id()` | uuid | id du profil de l'utilisateur connecté |

---

## Tables et Policies

### `profiles`
| Policy | Opération | Condition |
|---|---|---|
| Store lit tous les profils | SELECT | `is_store()` |
| Chacun lit son profil | SELECT | `user_id = auth.uid()` |

### `dossiers`
| Policy | Opération | Condition |
|---|---|---|
| Store accès total | ALL | `is_store()` |
| Client lit ses dossiers | SELECT | `client_id = my_profile_id()` |
| Client met à jour ses dossiers | UPDATE | `client_id = my_profile_id()` |

### `transporteurs`
| Policy | Opération | Condition |
|---|---|---|
| Authentifié lit transporteurs | SELECT | `auth.role() = 'authenticated'` |
| Store gère transporteurs | ALL | `is_store()` |

### `factures`
| Policy | Opération | Condition |
|---|---|---|
| Client lit ses factures | SELECT | Via jointure dossiers + `my_profile_id()` |
| Store gère toutes les factures | ALL | `is_store()` |
| Service role factures | ALL | `auth.role() = 'service_role'` |

### `devis_items`
| Policy | Opération | Condition |
|---|---|---|
| Client lit ses devis items | SELECT | Via jointure dossiers + `my_profile_id()` |
| Store gère tous les devis items | ALL | `is_store()` |

### `positions_gps`
| Policy | Opération | Condition |
|---|---|---|
| Authentifié lit positions GPS | SELECT | `auth.role() = 'authenticated'` |
| Service role insère positions | INSERT | `service_role` ou `authenticated` |

### `audit_logs`
| Policy | Opération | Condition |
|---|---|---|
| Store voit les audit_logs | SELECT | `is_store()` |
| Service role insère audit_logs | INSERT | `auth.role() = 'service_role'` |

### `demandes_publiques`
| Policy | Opération | Condition |
|---|---|---|
| Insertion publique | INSERT | `true` (public) |
| Store lit demandes | SELECT | `is_store()` |

---

## Triggers d'audit automatiques

| Trigger | Table | Événements |
|---|---|---|
| `trg_audit_dossiers` | dossiers | INSERT, UPDATE, DELETE |
| `trg_audit_transporteurs` | transporteurs | INSERT, UPDATE, DELETE |

Les triggers utilisent `auth.uid()` pour enregistrer l'utilisateur.
Pour les opérations server-side (service_role), `user_id` est null —
les logs Express compensent via `server/audit.ts`.

---

## Test des policies

```sql
-- Test en tant qu'anon (doit tout refuser)
SET request.jwt.claims TO '{"role":"anon"}';
SELECT * FROM dossiers; -- doit retourner 0 lignes

-- Test en tant que client
SET request.jwt.claims TO '{"role":"authenticated","sub":"<user_id_client>"}';
SELECT * FROM dossiers; -- doit retourner uniquement ses dossiers

-- Test en tant que store
SET request.jwt.claims TO '{"role":"authenticated","sub":"<user_id_store>"}';
SELECT * FROM dossiers; -- doit retourner tous les dossiers
```
