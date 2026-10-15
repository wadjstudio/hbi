-- R2 storage fields are server-managed: clients can no longer point a video at another
-- object key, fake an upload status, shrink counted bytes, or supply their own quota.

-- Single server-side quota. Change it with SQL as the database owner, never from a client.
create table public.storage_limits(
  singleton boolean primary key default true check (singleton),
  max_shared_bytes bigint not null check (max_shared_bytes > 0 and max_shared_bytes <= 10737418240)
);
insert into public.storage_limits(max_shared_bytes) values (1073741824);
alter table public.storage_limits enable row level security;
revoke all on public.storage_limits from public,anon,authenticated;

create function public.r2_shared_quota_bytes() returns bigint
language sql stable security definer set search_path=public as $$
  select max_shared_bytes from public.storage_limits where singleton
$$;
revoke all on function public.r2_shared_quota_bytes() from public,anon;
grant execute on function public.r2_shared_quota_bytes() to authenticated;

-- Only the reservation/completion functions below set this transaction-local flag.
create function public.guard_r2_storage() returns trigger
language plpgsql set search_path=public as $$ begin
  if coalesce(current_setting('hbi.r2_write', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    if new.r2_object_key is not null or new.storage_mode = 'r2' or new.status = 'uploading' then
      raise exception 'R2 storage fields are server-managed';
    end if;
    return new;
  end if;
  if new.r2_object_key is distinct from old.r2_object_key
    or (new.storage_mode is distinct from old.storage_mode and 'r2' in (new.storage_mode, old.storage_mode))
    or (new.status is distinct from old.status
      and (old.r2_object_key is not null or 'uploading' in (new.status, old.status)))
    or (new.file_size_bytes is distinct from old.file_size_bytes and old.r2_object_key is not null) then
    raise exception 'R2 storage fields are server-managed';
  end if;
  return new;
end $$;
create trigger guard_r2_storage before insert or update on public.videos
for each row execute function public.guard_r2_storage();
revoke all on function public.guard_r2_storage() from public,anon,authenticated;

drop function public.reserve_video_upload(uuid,bigint);
create function public.reserve_video_upload(p_video uuid) returns void
language plpgsql security invoker set search_path=public as $$ declare v public.videos;used bigint;quota bigint;begin
 select * into v from public.videos where id=p_video for update;if not found then raise exception 'Video inaccessible';end if;
 if not public.has_org_role(v.organization_id,array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]) then raise exception 'Forbidden';end if;
 quota:=public.r2_shared_quota_bytes();
 if quota is null or v.file_size_bytes is null or v.file_size_bytes<=0 then raise exception 'Invalid quota or size';end if;
 perform pg_advisory_xact_lock(hashtextextended(v.organization_id::text,0));
 select coalesce(sum(file_size_bytes),0) into used from public.videos where organization_id=v.organization_id and r2_object_key is not null and id<>v.id;
 if used+v.file_size_bytes>quota then raise exception 'Shared video quota exceeded';end if;
 perform set_config('hbi.r2_write','on',true);
 update public.videos set r2_object_key=v.organization_id::text||'/'||v.id::text||'/source',status='uploading' where id=v.id;
 perform set_config('hbi.r2_write','',true);
end $$;
revoke all on function public.reserve_video_upload(uuid) from public;
grant execute on function public.reserve_video_upload(uuid) to authenticated;

-- Called by /api/r2/complete after it verifies the uploaded object's size.
create function public.complete_video_upload(p_video uuid) returns void
language plpgsql security invoker set search_path=public as $$ declare v public.videos;begin
 select * into v from public.videos where id=p_video for update;if not found then raise exception 'Video inaccessible';end if;
 if not public.has_org_role(v.organization_id,array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]) then raise exception 'Forbidden';end if;
 if v.status<>'uploading' or v.r2_object_key is distinct from v.organization_id::text||'/'||v.id::text||'/source' then raise exception 'No upload reservation';end if;
 perform set_config('hbi.r2_write','on',true);
 update public.videos set status='ready',storage_mode='r2' where id=v.id;
 perform set_config('hbi.r2_write','',true);
end $$;
revoke all on function public.complete_video_upload(uuid) from public;
grant execute on function public.complete_video_upload(uuid) to authenticated;
