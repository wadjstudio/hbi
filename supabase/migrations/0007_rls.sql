create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id and om.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org_id uuid, allowed public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.role = any(allowed)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, public.org_role[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.org_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.teams enable row level security;
alter table public.seasons enable row level security;
alter table public.competitions enable row level security;
alter table public.players enable row level security;
alter table public.team_players enable row level security;
alter table public.matches enable row level security;
alter table public.match_roster enable row level security;
alter table public.videos enable row level security;
alter table public.analysis_sessions enable row level security;
alter table public.possessions enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.tags enable row level security;
alter table public.event_tags enable row level security;
alter table public.clips enable row level security;
alter table public.clip_events enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.reports enable row level security;
alter table public.insights enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_read on public.organizations for select using (public.is_org_member(id));
create policy organizations_create on public.organizations for insert with check (created_by = auth.uid());
create policy organizations_update on public.organizations for update
using (public.has_org_role(id, array['owner']::public.org_role[]));

create policy org_members_read on public.organization_members for select using (public.is_org_member(organization_id));
create policy org_members_manage on public.organization_members for all
using (public.has_org_role(organization_id, array['owner']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner']::public.org_role[]));

-- Helper macro cannot be defined in SQL migrations, so policies stay explicit.
create policy teams_read on public.teams for select using (public.is_org_member(organization_id));
create policy teams_write on public.teams for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach']::public.org_role[]));

create policy seasons_read on public.seasons for select using (public.is_org_member(organization_id));
create policy seasons_write on public.seasons for all
using (public.has_org_role(organization_id, array['owner','technical_director']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director']::public.org_role[]));

create policy competitions_read on public.competitions for select using (public.is_org_member(organization_id));
create policy competitions_write on public.competitions for all
using (public.has_org_role(organization_id, array['owner','technical_director']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director']::public.org_role[]));

create policy players_read on public.players for select using (public.is_org_member(organization_id));
create policy players_write on public.players for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy matches_read on public.matches for select using (public.is_org_member(organization_id));
create policy matches_write on public.matches for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy videos_read on public.videos for select using (public.is_org_member(organization_id));
create policy videos_write on public.videos for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy analysis_sessions_read on public.analysis_sessions for select using (public.is_org_member(organization_id));
create policy analysis_sessions_write on public.analysis_sessions for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy possessions_read on public.possessions for select using (public.is_org_member(organization_id));
create policy possessions_write on public.possessions for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy events_read on public.events for select using (public.is_org_member(organization_id));
create policy events_write on public.events for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy tags_read on public.tags for select using (public.is_org_member(organization_id));
create policy tags_write on public.tags for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy clips_read on public.clips for select using (public.is_org_member(organization_id));
create policy clips_write on public.clips for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy playlists_read on public.playlists for select using (public.is_org_member(organization_id));
create policy playlists_write on public.playlists for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy reports_read on public.reports for select using (public.is_org_member(organization_id));
create policy reports_write on public.reports for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

create policy insights_read on public.insights for select using (public.is_org_member(organization_id));
create policy insights_write on public.insights for all
using (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
with check (public.has_org_role(organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));

-- Child tables without organization_id are authorized through their parent.
create policy team_players_read on public.team_players for select using (
  exists(select 1 from public.teams t where t.id = team_id and public.is_org_member(t.organization_id))
);
create policy team_players_write on public.team_players for all using (
  exists(select 1 from public.teams t where t.id = team_id and public.has_org_role(t.organization_id, array['owner','technical_director','head_coach']::public.org_role[]))
) with check (
  exists(select 1 from public.teams t where t.id = team_id and public.has_org_role(t.organization_id, array['owner','technical_director','head_coach']::public.org_role[]))
);

create policy match_roster_read on public.match_roster for select using (
  exists(select 1 from public.matches m where m.id = match_id and public.is_org_member(m.organization_id))
);
create policy match_roster_write on public.match_roster for all using (
  exists(select 1 from public.matches m where m.id = match_id and public.has_org_role(m.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
) with check (
  exists(select 1 from public.matches m where m.id = match_id and public.has_org_role(m.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
);

create policy event_participants_read on public.event_participants for select using (
  exists(select 1 from public.events e where e.id = event_id and public.is_org_member(e.organization_id))
);
create policy event_participants_write on public.event_participants for all using (
  exists(select 1 from public.events e where e.id = event_id and public.has_org_role(e.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
) with check (
  exists(select 1 from public.events e where e.id = event_id and public.has_org_role(e.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
);

create policy event_tags_read on public.event_tags for select using (
  exists(select 1 from public.events e where e.id = event_id and public.is_org_member(e.organization_id))
);
create policy event_tags_write on public.event_tags for all using (
  exists(select 1 from public.events e where e.id = event_id and public.has_org_role(e.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
) with check (
  exists(select 1 from public.events e where e.id = event_id and public.has_org_role(e.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
);

create policy clip_events_read on public.clip_events for select using (
  exists(select 1 from public.clips c where c.id = clip_id and public.is_org_member(c.organization_id))
);
create policy clip_events_write on public.clip_events for all using (
  exists(select 1 from public.clips c where c.id = clip_id and public.has_org_role(c.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
) with check (
  exists(select 1 from public.clips c where c.id = clip_id and public.has_org_role(c.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
);

create policy playlist_items_read on public.playlist_items for select using (
  exists(select 1 from public.playlists p where p.id = playlist_id and public.is_org_member(p.organization_id))
);
create policy playlist_items_write on public.playlist_items for all using (
  exists(select 1 from public.playlists p where p.id = playlist_id and public.has_org_role(p.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
) with check (
  exists(select 1 from public.playlists p where p.id = playlist_id and public.has_org_role(p.organization_id, array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]))
);
