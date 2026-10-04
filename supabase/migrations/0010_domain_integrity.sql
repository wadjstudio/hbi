-- Cross-table organization invariants. RLS controls who can act; these triggers ensure
-- foreign keys cannot silently connect records belonging to different organizations.

create or replace function public.assert_match_integrity()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists(select 1 from public.teams t where t.id = new.home_team_id and t.organization_id = new.organization_id) then
    raise exception 'home team must belong to match organization';
  end if;
  if not exists(select 1 from public.teams t where t.id = new.away_team_id and t.organization_id = new.organization_id) then
    raise exception 'away team must belong to match organization';
  end if;
  if new.season_id is not null and not exists(select 1 from public.seasons s where s.id = new.season_id and s.organization_id = new.organization_id) then
    raise exception 'season must belong to match organization';
  end if;
  if new.competition_id is not null and not exists(select 1 from public.competitions c where c.id = new.competition_id and c.organization_id = new.organization_id) then
    raise exception 'competition must belong to match organization';
  end if;
  return new;
end; $$;

create trigger trg_match_integrity before insert or update on public.matches
for each row execute function public.assert_match_integrity();

create or replace function public.assert_team_player_integrity()
returns trigger language plpgsql set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.teams where id = new.team_id;
  if v_org is null then raise exception 'team not found'; end if;
  if not exists(select 1 from public.players p where p.id = new.player_id and p.organization_id = v_org) then
    raise exception 'player must belong to team organization';
  end if;
  if new.season_id is not null and not exists(select 1 from public.seasons s where s.id = new.season_id and s.organization_id = v_org) then
    raise exception 'season must belong to team organization';
  end if;
  return new;
end; $$;

create trigger trg_team_player_integrity before insert or update on public.team_players
for each row execute function public.assert_team_player_integrity();

create or replace function public.assert_match_roster_integrity()
returns trigger language plpgsql set search_path = public as $$
declare v_org uuid; v_home uuid; v_away uuid;
begin
  select organization_id, home_team_id, away_team_id into v_org, v_home, v_away from public.matches where id = new.match_id;
  if v_org is null then raise exception 'match not found'; end if;
  if new.team_id not in (v_home, v_away) then raise exception 'roster team must participate in match'; end if;
  if not exists(select 1 from public.teams t where t.id = new.team_id and t.organization_id = v_org) then raise exception 'team organization mismatch'; end if;
  if not exists(select 1 from public.players p where p.id = new.player_id and p.organization_id = v_org) then raise exception 'player organization mismatch'; end if;
  return new;
end; $$;

create trigger trg_match_roster_integrity before insert or update on public.match_roster
for each row execute function public.assert_match_roster_integrity();

create or replace function public.assert_video_integrity()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.match_id is not null and not exists(select 1 from public.matches m where m.id = new.match_id and m.organization_id = new.organization_id) then
    raise exception 'video match organization mismatch';
  end if;
  return new;
end; $$;
create trigger trg_video_integrity before insert or update on public.videos
for each row execute function public.assert_video_integrity();

create or replace function public.assert_analysis_session_integrity()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists(select 1 from public.matches m where m.id = new.match_id and m.organization_id = new.organization_id) then
    raise exception 'analysis match organization mismatch';
  end if;
  if new.video_id is not null and not exists(
    select 1 from public.videos v
    where v.id = new.video_id and v.organization_id = new.organization_id
      and (v.match_id is null or v.match_id = new.match_id)
  ) then raise exception 'analysis video mismatch'; end if;
  return new;
end; $$;
create trigger trg_analysis_session_integrity before insert or update on public.analysis_sessions
for each row execute function public.assert_analysis_session_integrity();

create or replace function public.assert_possession_integrity()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists(select 1 from public.analysis_sessions a where a.id = new.analysis_session_id and a.organization_id = new.organization_id and a.match_id = new.match_id) then
    raise exception 'possession analysis session mismatch';
  end if;
  if not exists(select 1 from public.teams t where t.id = new.team_id and t.organization_id = new.organization_id) then
    raise exception 'possession team organization mismatch';
  end if;
  return new;
end; $$;
create trigger trg_possession_integrity before insert or update on public.possessions
for each row execute function public.assert_possession_integrity();

create or replace function public.assert_event_integrity()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists(select 1 from public.analysis_sessions a where a.id = new.analysis_session_id and a.organization_id = new.organization_id and a.match_id = new.match_id) then
    raise exception 'event analysis session mismatch';
  end if;
  if new.possession_id is not null and not exists(
    select 1 from public.possessions p where p.id = new.possession_id and p.organization_id = new.organization_id
      and p.analysis_session_id = new.analysis_session_id and p.match_id = new.match_id
  ) then raise exception 'event possession mismatch'; end if;
  if new.team_id is not null and not exists(select 1 from public.teams t where t.id = new.team_id and t.organization_id = new.organization_id) then
    raise exception 'event team organization mismatch';
  end if;
  if new.actor_player_id is not null and not exists(select 1 from public.players p where p.id = new.actor_player_id and p.organization_id = new.organization_id) then
    raise exception 'event player organization mismatch';
  end if;
  return new;
end; $$;
create trigger trg_event_integrity before insert or update on public.events
for each row execute function public.assert_event_integrity();

create or replace function public.assert_clip_integrity()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists(select 1 from public.videos v where v.id = new.video_id and v.organization_id = new.organization_id) then
    raise exception 'clip video organization mismatch';
  end if;
  if new.match_id is not null and not exists(select 1 from public.matches m where m.id = new.match_id and m.organization_id = new.organization_id) then
    raise exception 'clip match organization mismatch';
  end if;
  return new;
end; $$;
create trigger trg_clip_integrity before insert or update on public.clips
for each row execute function public.assert_clip_integrity();
