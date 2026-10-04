create type public.report_type as enum ('match','opponent','player','team');
create type public.insight_source as enum ('rule','ai','manual');

create table public.clips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  title text not null,
  start_ms bigint not null,
  end_ms bigint not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check(end_ms > start_ms)
);

create table public.clip_events (
  clip_id uuid not null references public.clips(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  primary key(clip_id, event_id)
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  title text not null,
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  clip_id uuid not null references public.clips(id) on delete cascade,
  position integer not null,
  title_override text,
  coach_note text,
  unique(playlist_id, position)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_type public.report_type not null,
  match_id uuid references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  content jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  source public.insight_source not null,
  insight_key text,
  title text not null,
  body text not null,
  confidence numeric(5,4) check(confidence is null or confidence between 0 and 1),
  evidence jsonb not null default '[]'::jsonb,
  is_reviewed boolean not null default false,
  generated_at timestamptz not null default now()
);

create trigger playlists_set_updated_at before update on public.playlists
for each row execute function public.set_updated_at();
create trigger reports_set_updated_at before update on public.reports
for each row execute function public.set_updated_at();
