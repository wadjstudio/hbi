alter table public.match_roster add column id uuid not null default gen_random_uuid() unique;
alter table public.event_participants add column id uuid not null default gen_random_uuid() unique;
-- Revision CAS and idempotency. No service role and no model-supplied SQL.
do $$ declare t text; begin
 foreach t in array array['event_participants','team_players','video_clock_segments','teams','seasons','competitions','players','matches','videos','analysis_sessions','match_roster','possessions','events','shot_attempts','possession_tactics','on_court_intervals','substitutions','tactic_documents','tactic_frames','tactic_objects','tactic_frame_objects','tactic_animations','video_annotations','evidence_links','insights','clips','playlists','playlist_items','presentations','presentation_items','reports','tagging_templates','legacy_shot_reviews'] loop
 execute format('alter table public.%I add column revision bigint not null default 1',t);
 end loop;
end $$;
create table public.sync_receipts (
 operation_id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,result jsonb not null,created_at timestamptz not null default now()
);
alter table public.sync_receipts enable row level security;
grant select,insert on public.sync_receipts to authenticated;
revoke all on public.sync_receipts from anon;
create policy receipt_read on public.sync_receipts for select to authenticated using(user_id=auth.uid() and public.is_org_member(organization_id));
create policy receipt_insert on public.sync_receipts for insert to authenticated with check(user_id=auth.uid() and public.is_org_member(organization_id));

create function public.increment_revision() returns trigger language plpgsql as $$ begin new.revision:=old.revision+1; return new; end $$;
 do $$ declare t text; begin for t in select table_name from information_schema.columns where table_schema='public' and column_name='revision' loop
 execute format('create trigger revision_increment before update on public.%I for each row execute function public.increment_revision()',t);
end loop; end $$;

create function public.apply_workspace_change(p_table text,p_row jsonb,p_expected_revision bigint,p_operation_id uuid,p_delete boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_current jsonb; v_result jsonb; cols text; vals text; assignments text; key text; v_org uuid:=(p_row->>'organization_id')::uuid; v_id uuid:=(p_row->>'id')::uuid;
begin
 if p_table<>all(array['event_participants','team_players','video_clock_segments','teams','seasons','competitions','players','matches','videos','analysis_sessions','possessions','events','shot_attempts','possession_tactics','on_court_intervals','tactic_documents','tactic_frames','tactic_objects','tactic_frame_objects','tactic_animations','video_annotations','evidence_links','insights','clips','playlists','playlist_items','presentations','presentation_items','reports','tagging_templates','legacy_shot_reviews']) then raise exception 'Unsupported sync table'; end if;
 if not public.is_org_member(v_org) then raise exception 'Not a member'; end if;
 select result into v_result from public.sync_receipts where operation_id=p_operation_id and user_id=auth.uid() and organization_id=v_org;
 if found then return v_result; end if;
 -- Serialize retries per operation and concurrent writes per record (transaction locks).
 perform pg_advisory_xact_lock(hashtextextended(p_operation_id::text,0));
 select result into v_result from public.sync_receipts where operation_id=p_operation_id and user_id=auth.uid();
 if found then return v_result; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_table||v_id::text,0));
 execute format('select to_jsonb(t) from public.%I t where id=$1 and organization_id=$2 for update',p_table) into v_current using v_id,v_org;
 if (v_current is null and p_expected_revision<>0) or (v_current is not null and (v_current->>'revision')::bigint<>p_expected_revision) then
 return jsonb_build_object('status','conflict','server',v_current,'local',p_row);
 end if;
 if p_delete then
 if v_current is null then raise exception 'Cannot delete absent row'; end if;
 execute format('delete from public.%I where id=$1 and organization_id=$2 returning jsonb_build_object(''id'',id,''deleted'',true)',p_table) into v_result using v_id,v_org;
 if v_result is null then raise exception 'Delete denied'; end if;
 else
 p_row:=p_row-'revision'-'display_name'-'created_at'-'updated_at';
 if v_current is null and exists(select 1 from information_schema.columns where table_schema='public' and table_name=p_table and column_name='created_by') then p_row:=p_row||jsonb_build_object('created_by',auth.uid()); end if;
 if v_current is not null then p_row:=p_row-'created_by'-'organization_id'-'id'; end if;
 for key in select jsonb_object_keys(p_row) loop
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=p_table and column_name=key and is_generated='NEVER') then raise exception 'Invalid column %',key; end if;
 end loop;
 select string_agg(format('%I',k),','),string_agg(format('(jsonb_populate_record(null::public.%I,$1)).%I',p_table,k),','),string_agg(format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',k,p_table,k),',') into cols,vals,assignments from jsonb_object_keys(p_row) k;
 if v_current is null then execute format('insert into public.%I(%s) select %s returning to_jsonb(%I.*)',p_table,cols,vals,p_table) into v_result using p_row;
 else execute format('update public.%I set %s where id=$2 and organization_id=$3 returning to_jsonb(%I.*)',p_table,assignments,p_table) into v_result using p_row,v_id,v_org; end if;
 if v_result is null then raise exception 'Write denied'; end if;
 end if;
 v_result:=jsonb_build_object('status','applied','row',v_result);
 insert into public.sync_receipts(operation_id,user_id,organization_id,result) values(p_operation_id,auth.uid(),v_org,v_result);
 return v_result;
end $$;
revoke all on function public.apply_workspace_change(text,jsonb,bigint,uuid,boolean) from public;
grant execute on function public.apply_workspace_change(text,jsonb,bigint,uuid,boolean) to authenticated;

create function public.record_substitution(p_row jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.substitutions; found_id uuid; changed integer;
begin
 s:=jsonb_populate_record(null::public.substitutions,p_row);
 perform pg_advisory_xact_lock(hashtextextended(s.analysis_session_id::text||s.team_id::text,0));
 select id into found_id from public.substitutions where id=s.id;
 if found then return jsonb_build_object('id',found_id); end if;
 if s.out_player_id is not null then
 update public.on_court_intervals set end_clock_ms=s.clock_ms where analysis_session_id=s.analysis_session_id and team_id=s.team_id and player_id=s.out_player_id and period=s.period and end_clock_ms is null and start_clock_ms<s.clock_ms;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Outgoing player needs one open interval'; end if;
 end if;
 if s.in_player_id is not null then
 insert into public.on_court_intervals(id,organization_id,analysis_session_id,match_id,team_id,player_id,position,period,start_clock_ms,verified)
 values(s.id,s.organization_id,s.analysis_session_id,s.match_id,s.team_id,s.in_player_id,s.position,s.period,s.clock_ms,true);
 end if;
 insert into public.substitutions(id,organization_id,analysis_session_id,match_id,team_id,out_player_id,in_player_id,period,clock_ms,video_ms,position)
 values(s.id,s.organization_id,s.analysis_session_id,s.match_id,s.team_id,s.out_player_id,s.in_player_id,s.period,s.clock_ms,s.video_ms,s.position);
 return jsonb_build_object('id',s.id);
end $$;
revoke all on function public.record_substitution(jsonb) from public;
grant execute on function public.record_substitution(jsonb) to authenticated;

create or replace view public.v_shot_metrics with(security_invoker=true) as
select s.*,e.match_id,e.analysis_session_id,e.team_id,e.period,e.timestamp_ms,e.match_clock_ms,e.actor_position,
 a.is_primary
from public.events e join public.shot_attempts s on s.event_id=e.id join public.analysis_sessions a on a.id=e.analysis_session_id;

create or replace view public.v_event_metrics with(security_invoker=true) as
select e.organization_id,e.match_id,e.team_id,e.actor_player_id,e.period,e.phase,e.attack_system,e.defense_system,e.court_zone,
 count(s.id) filter(where not s.review_required and s.result<>'unknown') as shot_events,
 count(s.id) filter(where not s.review_required and s.result='goal') as goals,
 count(*) filter(where e.event_type='turnover') as turnovers,
 count(s.id) filter(where not s.review_required and s.result='save') as saves
from public.events e join public.analysis_sessions a on a.id=e.analysis_session_id and a.is_primary
left join public.shot_attempts s on s.event_id=e.id
group by e.organization_id,e.match_id,e.team_id,e.actor_player_id,e.period,e.phase,e.attack_system,e.defense_system,e.court_zone;
create or replace function public.get_team_attack_summary(p_team_id uuid,p_match_ids uuid[] default null)
returns jsonb language sql stable security invoker set search_path=public as $$
select jsonb_build_object(
 'possessions',(select count(*) from public.possessions p join public.analysis_sessions a on a.id=p.analysis_session_id and a.is_primary where p.team_id=p_team_id and (p_match_ids is null or p.match_id=any(p_match_ids))),
 'goals',(select count(*) from public.v_shot_metrics where team_id=p_team_id and is_primary and not review_required and result='goal' and (p_match_ids is null or match_id=any(p_match_ids))),
 'shots',(select count(*) from public.v_shot_metrics where team_id=p_team_id and is_primary and not review_required and result<>'unknown' and (p_match_ids is null or match_id=any(p_match_ids))),
 'turnovers',(select sum(turnovers) from public.v_event_metrics where team_id=p_team_id and (p_match_ids is null or match_id=any(p_match_ids)))
); $$;
-- Team means the defending team here, not the possession's attacking team.
create or replace function public.get_defense_system_distribution(p_team_id uuid,p_match_ids uuid[] default null)
returns table(defense_system public.defense_system,possessions bigint,share numeric)
language sql stable security invoker set search_path=public as $$
with sample as(select p.opponent_defense from public.possessions p join public.analysis_sessions a on a.id=p.analysis_session_id and a.is_primary
 join public.matches m on m.id=p.match_id where p.team_id<>p_team_id and p_team_id in(m.home_team_id,m.away_team_id)
 and (p_match_ids is null or p.match_id=any(p_match_ids)) and p.opponent_defense is not null and p.opponent_defense<>'unknown'),
total as(select count(*)::numeric n from sample)
select s.opponent_defense,count(*)::bigint,round(count(*)/nullif(t.n,0),4) from sample s cross join total t group by s.opponent_defense,t.n order by count(*) desc;
$$;
revoke all on function public.get_team_attack_summary(uuid,uuid[]),public.get_defense_system_distribution(uuid,uuid[]) from public;
grant execute on function public.get_team_attack_summary(uuid,uuid[]),public.get_defense_system_distribution(uuid,uuid[]) to authenticated;
grant select on public.v_shot_metrics,public.v_event_metrics to authenticated;
revoke all on public.v_shot_metrics,public.v_event_metrics from anon;
