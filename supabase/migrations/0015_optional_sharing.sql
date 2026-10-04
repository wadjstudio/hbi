create function public.reserve_video_upload(p_video uuid,p_limit bigint) returns void
language plpgsql security invoker set search_path=public as $$ declare v public.videos;used bigint;begin
 select * into v from public.videos where id=p_video;if not found then raise exception 'Video inaccessible';end if;
 if not public.has_org_role(v.organization_id,array['owner','technical_director','head_coach','assistant_coach','analyst']::public.org_role[]) then raise exception 'Forbidden';end if;
 if p_limit<=0 or p_limit>10737418240 or v.file_size_bytes is null or v.file_size_bytes<=0 then raise exception 'Invalid quota or size';end if;
 perform pg_advisory_xact_lock(hashtextextended(v.organization_id::text,0));
 select coalesce(sum(file_size_bytes),0) into used from public.videos where organization_id=v.organization_id and r2_object_key is not null and id<>v.id;
 if used+v.file_size_bytes>p_limit then raise exception 'Shared video quota exceeded';end if;
 update public.videos set r2_object_key=v.organization_id::text||'/'||v.id::text||'/source',status='uploading' where id=v.id;
end $$;
revoke all on function public.reserve_video_upload(uuid,bigint) from public;
grant execute on function public.reserve_video_upload(uuid,bigint) to authenticated;
