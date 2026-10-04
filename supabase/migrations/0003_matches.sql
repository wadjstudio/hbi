create type public.match_status as enum ('scheduled','ready','in_analysis','analysed','archived');
create type public.match_team_side as enum ('home','away');
create type public.video_storage_mode as enum ('local','r2');
create type public.video_status as enum ('pending','ready','missing_local_file','uploading','error');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  competition_id uuid references public.competitions(id) on delete set null,
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  starts_at timestamptz,
  venue text,
  home_score smallint,
  away_score smallint,
  status public.match_status not null default 'scheduled',
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table public.match_roster (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id),
  team_id uuid not null references public.teams(id),
  side public.match_team_side not null,
  shirt_number smallint,
  starting boolean not null default false,
  primary key(match_id, player_id)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  storage_mode public.video_storage_mode not null,
  status public.video_status not null default 'pending',
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  duration_ms bigint,
  width integer,
  height integer,
  fps numeric(7,3),
  local_fingerprint text,
  r2_object_key text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (
    (storage_mode = 'local' and local_fingerprint is not null)
    or (storage_mode = 'r2' and r2_object_key is not null)
  )
);

create table public.analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  video_id uuid references public.videos(id) on delete set null,
  title text,
  analyst_id uuid not null references auth.users(id),
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger matches_set_updated_at before update on public.matches
for each row execute function public.set_updated_at();
create trigger analysis_sessions_set_updated_at before update on public.analysis_sessions
for each row execute function public.set_updated_at();
