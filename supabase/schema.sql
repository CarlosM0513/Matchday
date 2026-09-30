-- MATCHDAY / Supabase
-- Ejecutar completo en Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apodo text,
  num integer,
  pos text,
  equipo text,
  pie text,
  nivel text,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  modo text not null,
  fecha date not null,
  hora time not null,
  cancha text not null,
  max_players integer not null check (max_players >= 2),
  precio numeric not null default 0 check (precio >= 0),
  nivel text,
  publico boolean not null default true,
  descripcion text not null default '',
  conf integer not null default 1 check (conf >= 0),
  faltan text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.match_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  pos text,
  comentario text,
  estado text not null default 'pendiente' check (estado in ('pendiente','aceptada','rechazada')),
  created_at timestamptz not null default now(),
  unique(match_id, player_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text not null,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists matches_owner_idx on public.matches(owner_id);
create index if not exists matches_fecha_idx on public.matches(fecha);
create index if not exists requests_match_idx on public.match_requests(match_id);
create index if not exists requests_player_idx on public.match_requests(player_id);
create index if not exists notifications_user_idx on public.notifications(user_id);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_requests enable row level security;
alter table public.notifications enable row level security;

-- Perfiles: públicos para lectura; cada usuario administra su propio perfil.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (id = auth.uid());

-- Partidos: lectura pública solo para autenticados; escritura del propietario.
drop policy if exists "matches_read" on public.matches;
create policy "matches_read" on public.matches for select to authenticated using (publico = true or owner_id = auth.uid());
drop policy if exists "matches_insert_own" on public.matches;
create policy "matches_insert_own" on public.matches for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "matches_update_own" on public.matches;
create policy "matches_update_own" on public.matches for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "matches_delete_own" on public.matches;
create policy "matches_delete_own" on public.matches for delete to authenticated using (owner_id = auth.uid());

-- Solicitudes: quien solicita puede crear/ver las suyas; el dueño del partido puede gestionarlas.
drop policy if exists "requests_read" on public.match_requests;
create policy "requests_read" on public.match_requests for select to authenticated using (
  player_id = auth.uid()
  or exists (select 1 from public.matches m where m.id = match_id and m.owner_id = auth.uid())
);
drop policy if exists "requests_insert_own" on public.match_requests;
create policy "requests_insert_own" on public.match_requests for insert to authenticated with check (player_id = auth.uid());
drop policy if exists "requests_update_owner" on public.match_requests;
create policy "requests_update_owner" on public.match_requests for update to authenticated using (
  exists (select 1 from public.matches m where m.id = match_id and m.owner_id = auth.uid())
) with check (
  exists (select 1 from public.matches m where m.id = match_id and m.owner_id = auth.uid())
);
drop policy if exists "requests_delete_own" on public.match_requests;
create policy "requests_delete_own" on public.match_requests for delete to authenticated using (player_id = auth.uid());

-- Avisos privados.
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime para cambios de partidos, solicitudes y avisos.
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_requests;
alter publication supabase_realtime add table public.notifications;
