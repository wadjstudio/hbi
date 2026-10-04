create function public.reorder_items(p_table text,p_parent uuid,p_ids uuid[]) returns void
language plpgsql security invoker set search_path=public as $$
declare parent_col text; existing uuid[]; i integer; affected integer; begin
 if p_table='presentation_items' then parent_col:='presentation_id';
 elsif p_table='playlist_items' then parent_col:='playlist_id';else raise exception 'Unsupported ordered collection';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_table||p_parent::text,0));
 execute format('select array_agg(id order by id) from public.%I where %I=$1',p_table,parent_col) into existing using p_parent;
 if (select array_agg(id order by id) from unnest(p_ids) id) is distinct from existing then raise exception 'Provide every item once';end if;
 if cardinality(p_ids)=0 then return;end if;
 -- Disjoint temporary positions avoid immediate unique-constraint collisions.
 execute format('update public.%I set position=position+1000000 where %I=$1',p_table,parent_col) using p_parent;
 get diagnostics affected=row_count;if affected<>cardinality(p_ids) then raise exception 'Reorder denied';end if;
 for i in 1..cardinality(p_ids) loop execute format('update public.%I set position=$1 where id=$2 and %I=$3',p_table,parent_col) using i-1,p_ids[i],p_parent;end loop;
end $$;
revoke all on function public.reorder_items(text,uuid,uuid[]) from public;
grant execute on function public.reorder_items(text,uuid,uuid[]) to authenticated;
-- Immutable category/code preserve the meaning of historic assignments.
create function public.freeze_term_identity() returns trigger language plpgsql as $$ begin
 if new.category<>old.category or new.code<>old.code then raise exception 'Archive the term and create another code';end if;return new;
end $$;
create trigger term_identity before update on public.tactical_terms for each row execute function public.freeze_term_identity();
alter table public.possessions add constraint possession_numbers check(numerical_for between 0 and 7 and numerical_against between 0 and 7);
alter table public.events add constraint event_numbers check(numerical_for between 0 and 7 and numerical_against between 0 and 7);
-- Starting lineup is captured by roster.starting and clock-zero intervals;
-- intervals are closed at period end, not inferred from missing footage.
create function public.set_primary_analysis(p_session uuid) returns void language plpgsql security invoker set search_path=public as $$
declare m uuid;begin
 select match_id into m from public.analysis_sessions where id=p_session;if m is null then raise exception 'Session inaccessible';end if;
 perform pg_advisory_xact_lock(hashtextextended(m::text,0));
 update public.analysis_sessions set is_primary=false where match_id=m and is_primary;
 update public.analysis_sessions set is_primary=true where id=p_session;
 if not found then raise exception 'Primary session update denied';end if;
end $$;
revoke all on function public.set_primary_analysis(uuid) from public;
grant execute on function public.set_primary_analysis(uuid) to authenticated;
