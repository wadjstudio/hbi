-- Validate new/edited rows only; legacy times are never silently rewritten.
create function public.validate_source_time() returns trigger
language plpgsql set search_path = public as $$
declare duration bigint; start_time bigint; finish_time bigint;
begin
  select v.duration_ms into duration from analysis_sessions a
    join videos v on v.id = a.video_id
    where a.id = new.analysis_session_id and a.organization_id = new.organization_id;
  if tg_table_name = 'events' then
    start_time := new.timestamp_ms; finish_time := coalesce(new.end_ms,new.timestamp_ms);
  elsif tg_table_name = 'video_clock_segments' then
    start_time := new.video_start_ms; finish_time := new.video_end_ms;
  else
    start_time := new.start_ms; finish_time := new.end_ms;
  end if;
  if start_time < 0 or (finish_time is not null and finish_time < start_time)
     or (duration is not null and (start_time > duration or finish_time > duration)) then
    raise exception 'Time falls outside the analysis source';
  end if;
  return new;
end $$;
create trigger events_source_time before insert or update on public.events
  for each row execute function public.validate_source_time();
create trigger possessions_source_time before insert or update on public.possessions
  for each row execute function public.validate_source_time();
create trigger clock_segments_source_time before insert or update on public.video_clock_segments
  for each row execute function public.validate_source_time();
revoke all on function public.validate_source_time() from public, anon, authenticated;

create function public.validate_evidence_source() returns trigger
language plpgsql set search_path = public as $$
declare event_ref uuid; event_source uuid; clip_source uuid;
begin
  if new.clip_id is null or (new.event_id is null and new.shot_id is null) then return new; end if;
  event_ref := new.event_id;
  if event_ref is null then select event_id into event_ref from shot_attempts where id = new.shot_id; end if;
  select a.video_id into event_source from events e join analysis_sessions a on a.id = e.analysis_session_id
    where e.id = event_ref and e.organization_id = new.organization_id;
  select video_id into clip_source from clips where id = new.clip_id and organization_id = new.organization_id;
  if event_source is null or clip_source is distinct from event_source then
    raise exception 'Evidence clip must use the event analysis source';
  end if;
  return new;
end $$;
create trigger evidence_source before insert or update on public.evidence_links
  for each row execute function public.validate_evidence_source();
revoke all on function public.validate_evidence_source() from public, anon, authenticated;
