-- Repair authorization and cover every FK edge, including the legacy child tables.
do $$ declare spec text[]; begin
 foreach spec slice 1 in array array[
 ['team_players','team_id','teams'],['match_roster','match_id','matches'],['event_participants','event_id','events'],
 ['event_tags','event_id','events'],['clip_events','clip_id','clips'],['playlist_items','playlist_id','playlists']]
 loop
 execute format('alter table public.%I add column organization_id uuid',spec[1]);
 execute format('update public.%I c set organization_id=p.organization_id from public.%I p where c.%I=p.id',spec[1],spec[3],spec[2]);
 execute format('alter table public.%I alter column organization_id set not null',spec[1]);
 end loop;
end $$;

create function public.freeze_scope() returns trigger language plpgsql as $$ begin
 if new.organization_id is distinct from old.organization_id then raise exception 'Organization is immutable'; end if;
 return new;
end $$;
create function public.validate_domain_scope() returns trigger language plpgsql set search_path=public as $$
declare n jsonb:=to_jsonb(new); p jsonb; rel text[]; parent uuid; expected uuid; expected_session uuid; field text; tab text;
begin
 -- Immutable relational identity: re-parenting a child would invalidate its descendants.
 if tg_op='UPDATE' then
 foreach field in array array['match_id','analysis_session_id','video_id','possession_id','event_id','frame_id','object_id','document_id','presentation_id','playlist_id'] loop
 if n ? field and (n->field) is distinct from (to_jsonb(old)->field) then raise exception '% is immutable; create a new record',field; end if;
 end loop;
 end if;
 foreach rel slice 1 in array array[
 ['analysis_session_id','analysis_sessions'],['possession_id','possessions'],['video_id','videos'],['event_id','events'],
 ['clip_id','clips'],['insight_id','insights'],['shot_id','shot_attempts'],['tactic_id','tactic_documents']]
 loop
 parent:=nullif(n->>rel[1],'')::uuid;
 if parent is null then continue; end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1',rel[2]) into p using parent;
 if rel[2]='shot_attempts' and p is not null then select p||jsonb_build_object('match_id',e.match_id,'analysis_session_id',e.analysis_session_id) into p from public.events e where e.id=(p->>'event_id')::uuid; end if;
 if p is null or p->>'organization_id'<>n->>'organization_id' then raise exception 'Invalid scoped reference %',rel[1]; end if;
 foreach field in array array['match_id','analysis_session_id','video_id'] loop
 if n->>field is not null and p->>field is not null and n->>field<>p->>field then raise exception 'Context mismatch: %',field; end if;
 end loop;
 if n->>'match_id' is null and p->>'match_id' is not null then
 if expected is not null and expected<> (p->>'match_id')::uuid then raise exception 'Evidence references different matches'; end if;
 expected:=(p->>'match_id')::uuid;
 end if;
  if n->>'analysis_session_id' is null and p->>'analysis_session_id' is not null then
  if expected_session is not null and expected_session<>(p->>'analysis_session_id')::uuid then raise exception 'Evidence references different analysis sessions'; end if;
  expected_session:=(p->>'analysis_session_id')::uuid;
  end if;
 end loop;
  if tg_table_name='events' then
  if new.actor_player_id is not null and not exists(select 1 from public.match_roster r where r.match_id=new.match_id and r.team_id=new.team_id and r.player_id=new.actor_player_id) then raise exception 'Actor must be in event team roster'; end if;
  if new.possession_id is not null and new.team_id is not null and not exists(select 1 from public.possessions q where q.id=new.possession_id and q.team_id=new.team_id) then raise exception 'Event/possession team mismatch'; end if;
  end if;
 if tg_table_name in ('events','possessions','on_court_intervals','substitutions','match_roster') and n->>'team_id' is not null then
 if not exists(select 1 from public.matches m where m.id=(n->>'match_id')::uuid and (n->>'team_id')::uuid in (m.home_team_id,m.away_team_id)) then raise exception 'Team does not play in match'; end if;
 end if;
 if tg_table_name='match_roster' then
 if not exists(select 1 from public.matches m where m.id=new.match_id and new.team_id=case new.side when 'home' then m.home_team_id else m.away_team_id end) then raise exception 'Roster side mismatch'; end if;
 end if;
 if tg_table_name in ('on_court_intervals','substitutions') then
 foreach field in array array['player_id','in_player_id','out_player_id'] loop
 if n->>field is not null and not exists(select 1 from public.match_roster r where r.match_id=(n->>'match_id')::uuid and r.team_id=(n->>'team_id')::uuid and r.player_id=(n->>field)::uuid) then raise exception 'Player must be in match roster'; end if;
 end loop;
 end if;
 if tg_table_name='event_participants' then
 if not exists(select 1 from public.events e join public.match_roster r on r.match_id=e.match_id where e.id=new.event_id and r.player_id=new.player_id) then raise exception 'Event participant must be in match roster'; end if;
 end if;
 if tg_table_name='tactic_frame_objects' then if not exists(select 1 from public.tactic_frames f join public.tactic_objects o on o.document_id=f.document_id where f.id=new.frame_id and o.id=new.object_id) then raise exception 'Frame/object document mismatch'; end if; end if;
 if tg_table_name='tactic_animations' then if not exists(select 1 from public.tactic_frames f join public.tactic_frames t on t.document_id=f.document_id where f.id=new.from_frame_id and t.id=new.to_frame_id and t.position>f.position) then raise exception 'Animation frames must advance within same document'; end if; end if;
 if tg_table_name='video_annotations' then if not exists(select 1 from public.analysis_sessions a where a.id=new.analysis_session_id and a.video_id=new.video_id) then raise exception 'Annotation video mismatch'; end if; end if;
 if tg_table_name in ('clips','video_annotations') then
 select to_jsonb(v) into p from public.videos v where v.id=(n->>'video_id')::uuid;
 if (n->>'start_ms')::bigint<0 or (p->>'duration_ms' is not null and (n->>'end_ms')::bigint>(p->>'duration_ms')::bigint) then raise exception 'Range outside source video'; end if;
 end if;
 if tg_table_name='possession_tactics' then
 if not exists(select 1 from public.tactical_terms t where t.id=new.term_id and (t.organization_id is null or t.organization_id=new.organization_id)) then raise exception 'Invalid tactical term'; end if;
 end if;
 if tg_table_name='shot_attempts' then
  if exists(select 1 from public.events e where e.id=new.event_id and e.actor_player_id is not null and new.shooter_id is distinct from e.actor_player_id) then raise exception 'Shot shooter must match event actor'; end if;
 if new.shot_type_id is not null and not exists(select 1 from public.tactical_terms t where t.id=new.shot_type_id and t.category='shot_type' and (t.organization_id is null or t.organization_id=new.organization_id)) then raise exception 'Invalid shot type'; end if;
 if new.shooter_id is not null and not exists(select 1 from public.events e join public.match_roster r on r.match_id=e.match_id and r.player_id=new.shooter_id and r.team_id=e.team_id where e.id=new.event_id) then raise exception 'Shooter must be in event team roster'; end if;
 if new.goalkeeper_id is not null and not exists(select 1 from public.events e join public.match_roster r on r.match_id=e.match_id and r.player_id=new.goalkeeper_id and r.team_id<>e.team_id where e.id=new.event_id) then raise exception 'Goalkeeper must be in opposing roster'; end if;
 end if;
 return new;
end $$;

-- Composite FKs prevent cross-org references even for privileged maintenance.
do $$ declare t text; r record; parent text; name text; writers public.org_role[]; deleters public.org_role[]; begin
 for t in select c.table_name from information_schema.columns c join information_schema.tables b on b.table_schema=c.table_schema and b.table_name=c.table_name where c.table_schema='public' and c.column_name='organization_id' and c.table_name<>'tactical_terms' and b.table_type='BASE TABLE' loop
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='id') then
 execute format('alter table public.%I add constraint %I unique(organization_id,id)',t,t||'_scope_unique');
 end if;
 execute format('create trigger freeze_scope before update on public.%I for each row execute function public.freeze_scope()',t);
 execute format('create trigger validate_scope before insert or update on public.%I for each row execute function public.validate_domain_scope()',t);
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create index %I on public.%I(organization_id)',t||'_org_idx',t);
 for r in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',r.policyname,t); end loop;
 writers:=array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[];
 if t in ('teams','team_players') then writers:=array['owner','technical_director','head_coach']::public.org_role[]; end if;
 if t in ('seasons','competitions') then writers:=array['owner','technical_director']::public.org_role[]; end if;
 if t='organization_members' then writers:=array['owner']::public.org_role[]; end if;
 deleters:=writers;
 if t='matches' then deleters:=array['owner','technical_director','head_coach']::public.org_role[]; end if;
 execute format('create policy scoped_read on public.%I for select to authenticated using(public.is_org_member(organization_id))',t);
 execute format('create policy scoped_insert on public.%I for insert to authenticated with check(public.has_org_role(organization_id,%L::public.org_role[]))',t,writers::text);
 execute format('create policy scoped_update on public.%I for update to authenticated using(public.has_org_role(organization_id,%L::public.org_role[])) with check(public.has_org_role(organization_id,%L::public.org_role[]))',t,writers::text,writers::text);
 execute format('create policy scoped_delete on public.%I for delete to authenticated using(public.has_org_role(organization_id,%L::public.org_role[]))',t,deleters::text);
 end loop;
 for r in select tc.table_name,kcu.column_name,ccu.table_name parent
 from information_schema.table_constraints tc
 join information_schema.key_column_usage kcu on kcu.constraint_name=tc.constraint_name and kcu.constraint_schema=tc.constraint_schema
 join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name and ccu.constraint_schema=tc.constraint_schema
 where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public' and ccu.table_schema='public' and ccu.column_name='id'
 and ccu.table_name not in ('organizations','tactical_terms')
 and exists(select 1 from information_schema.columns where table_schema='public' and table_name=tc.table_name and column_name='organization_id')
 and exists(select 1 from information_schema.columns where table_schema='public' and table_name=ccu.table_name and column_name='organization_id')
 loop
 name:=left(r.table_name||'_'||r.column_name||'_scope_fk',63);
 execute format('alter table public.%I add constraint %I foreign key(organization_id,%I) references public.%I(organization_id,id)',r.table_name,name,r.column_name,r.parent);
 execute format('create index if not exists %I on public.%I(%I)',left(r.table_name||'_'||r.column_name||'_lookup',63),r.table_name,r.column_name);
 end loop;
end $$;
-- Child joins are now scoped explicitly, without relying on just one parent policy.
alter table public.tactical_terms enable row level security;
revoke all on public.tactical_terms from anon;
grant select,insert,update on public.tactical_terms to authenticated;
create policy terms_read on public.tactical_terms for select to authenticated using(organization_id is null or public.is_org_member(organization_id));
create policy terms_insert on public.tactical_terms for insert to authenticated with check(organization_id is not null and public.has_org_role(organization_id,array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));
create policy terms_update on public.tactical_terms for update to authenticated using(organization_id is not null and public.has_org_role(organization_id,array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[])) with check(organization_id is not null and public.has_org_role(organization_id,array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]));
create trigger freeze_scope before update on public.tactical_terms for each row execute function public.freeze_scope();
alter table public.metric_definitions enable row level security;
revoke all on public.metric_definitions from anon,authenticated;
grant select on public.metric_definitions to authenticated;
create policy metrics_read on public.metric_definitions for select to authenticated using(true);
revoke all on public.organizations,public.profiles from anon;
grant select,update on public.organizations,public.profiles to authenticated;
revoke insert,delete on public.organizations from authenticated;
drop policy organizations_create on public.organizations;

-- One canonical session per match; deterministic repair of earlier multiple primaries.
with ranked as(select id,row_number() over(partition by match_id order by is_primary desc,created_at,id) n from public.analysis_sessions)
update public.analysis_sessions a set is_primary=(r.n=1) from ranked r where a.id=r.id;
create unique index analysis_primary_match on public.analysis_sessions(match_id) where is_primary;
create index intervals_context on public.on_court_intervals(analysis_session_id,period,start_clock_ms);
create index annotations_video_time on public.video_annotations(video_id,start_ms,end_ms);
create index frames_order on public.tactic_frames(document_id,position);
create index evidence_insight on public.evidence_links(insight_id);
create index evidence_event on public.evidence_links(event_id);
create index evidence_shot on public.evidence_links(shot_id);
create index evidence_clip on public.evidence_links(clip_id);
create index evidence_tactic on public.evidence_links(tactic_id);
alter table public.events add constraint event_nonnegative_time check(timestamp_ms>=0);
alter table public.possessions add constraint possession_nonnegative_time check(start_ms>=0);
