-- ─────────────────────────────────────────────────────────────────────────────
-- Trans Services Marchita — Schéma initial
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── profiles ────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid unique references auth.users(id) on delete cascade,
  email      text not null,
  nom        text not null default '',
  prenom     text not null default '',
  telephone  text not null default '',
  role       text not null check (role in ('client','store','transporter','broker')) default 'client',
  created_at timestamptz not null default now()
);

-- Auto-création du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── transporteurs ───────────────────────────────────────────────────────────

create table public.transporteurs (
  id         uuid primary key default uuid_generate_v4(),
  code       text not null unique,
  nom        text not null,
  type       text not null check (type in ('camion','courtier')),
  telephone  text not null default '',
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── dossiers ────────────────────────────────────────────────────────────────

create table public.dossiers (
  id                       uuid primary key default uuid_generate_v4(),
  numero                   text not null unique,
  client_id                uuid references public.profiles(id),
  transporteur_id          uuid references public.transporteurs(id),
  statut                   text not null default 'en_attente'
                             check (statut in (
                               'brouillon','en_attente','devis_envoye',
                               'devis_attente_validation','valide','paye',
                               'en_transit','livre','facture_generee','annule'
                             )),
  type_colis               text not null check (type_colis in ('colis','electromenager','vehicule','autre')),
  description              text not null default '',
  poids_kg                 numeric,
  volume_m3                numeric,
  adresse_depart           text not null default '',
  adresse_arrivee          text not null default '',
  montant_devis            numeric,
  stripe_payment_intent_id text,
  stripe_session_id        text,
  paye_le                  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Numéro automatique DOS-YYYY-XXXXXX
create sequence public.dossier_seq;

create or replace function public.generate_dossier_numero()
returns trigger language plpgsql as $$
begin
  new.numero := 'DOS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.dossier_seq')::text, 6, '0');
  return new;
end;
$$;

create trigger set_dossier_numero
  before insert on public.dossiers
  for each row when (new.numero is null or new.numero = '')
  execute function public.generate_dossier_numero();

-- updated_at automatique
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger dossiers_updated_at
  before update on public.dossiers
  for each row execute function public.set_updated_at();

-- ─── devis_items ─────────────────────────────────────────────────────────────

create table public.devis_items (
  id         uuid primary key default uuid_generate_v4(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  label      text not null,
  montant    numeric not null,
  created_at timestamptz not null default now()
);

-- ─── factures ────────────────────────────────────────────────────────────────

create table public.factures (
  id          uuid primary key default uuid_generate_v4(),
  dossier_id  uuid not null references public.dossiers(id) on delete cascade,
  numero      text not null unique,
  montant_ht  numeric not null,
  tva         numeric not null,
  montant_ttc numeric not null,
  pdf_url     text,
  created_at  timestamptz not null default now()
);

-- ─── positions_gps ───────────────────────────────────────────────────────────

create table public.positions_gps (
  id               uuid primary key default uuid_generate_v4(),
  transporteur_id  uuid not null references public.transporteurs(id) on delete cascade,
  latitude         double precision not null,
  longitude        double precision not null,
  vitesse_kmh      numeric,
  cap              numeric,
  created_at       timestamptz not null default now()
);

-- Index pour les requêtes temps réel
create index positions_gps_transporteur_created on public.positions_gps(transporteur_id, created_at desc);

-- ─── Vue : dernière position par transporteur ─────────────────────────────────

create view public.derniere_position as
select
  t.id          as transporteur_id,
  t.code,
  t.nom,
  t.type,
  t.actif,
  p.latitude,
  p.longitude,
  p.vitesse_kmh,
  p.created_at  as derniere_maj
from public.transporteurs t
join lateral (
  select latitude, longitude, vitesse_kmh, created_at
  from   public.positions_gps
  where  transporteur_id = t.id
  order  by created_at desc
  limit  1
) p on true
where t.actif = true;

-- ─── demandes publiques (formulaire non connecté) ────────────────────────────

create table public.demandes_publiques (
  id              uuid primary key default uuid_generate_v4(),
  nom             text not null,
  prenom          text not null,
  email           text not null,
  telephone       text not null default '',
  type_colis      text not null,
  description     text not null default '',
  adresse_depart  text not null default '',
  adresse_arrivee text not null default '',
  poids_kg        numeric,
  traitee         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.dossiers          enable row level security;
alter table public.transporteurs     enable row level security;
alter table public.positions_gps     enable row level security;
alter table public.factures          enable row level security;
alter table public.devis_items       enable row level security;
alter table public.demandes_publiques enable row level security;

-- Profiles : lecture de son propre profil
create policy "Profil personnel" on public.profiles
  for all using (auth.uid() = user_id);

-- Store : lecture de tous les profils
create policy "Store voit tous les profils" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'store'
    )
  );

-- Dossiers clients : lecture de ses propres dossiers
create policy "Client ses dossiers" on public.dossiers
  for select using (
    client_id = (select id from public.profiles where user_id = auth.uid())
  );

create policy "Client update ses dossiers" on public.dossiers
  for update using (
    client_id = (select id from public.profiles where user_id = auth.uid())
  );

-- Store : accès total aux dossiers
create policy "Store accès dossiers" on public.dossiers
  for all using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'store'
    )
  );

-- Transporteurs : lecture publique (pour les clients connectés)
create policy "Lecture transporteurs" on public.transporteurs
  for select using (auth.role() = 'authenticated');

create policy "Store gère transporteurs" on public.transporteurs
  for all using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'store'
    )
  );

-- Positions GPS : lecture authentifiée
create policy "Lecture positions" on public.positions_gps
  for select using (auth.role() = 'authenticated');

create policy "Transporteur insère position" on public.positions_gps
  for insert with check (
    transporteur_id in (
      select t.id from public.transporteurs t
      join public.profiles p on p.user_id = auth.uid()
      where p.role in ('transporter','broker')
    )
  );

-- Factures : client voit ses factures
create policy "Client ses factures" on public.factures
  for select using (
    dossier_id in (
      select d.id from public.dossiers d
      join public.profiles p on p.id = d.client_id
      where p.user_id = auth.uid()
    )
  );

create policy "Store gère factures" on public.factures
  for all using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'store')
  );

-- Devis items : mêmes règles que factures
create policy "Client ses devis" on public.devis_items
  for select using (
    dossier_id in (
      select d.id from public.dossiers d
      join public.profiles p on p.id = d.client_id
      where p.user_id = auth.uid()
    )
  );

create policy "Store gère devis" on public.devis_items
  for all using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'store')
  );

-- Demandes publiques : insertion sans auth
create policy "Insertion publique" on public.demandes_publiques
  for insert with check (true);

create policy "Store lit demandes" on public.demandes_publiques
  for select using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'store')
  );
