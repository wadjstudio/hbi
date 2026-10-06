-- An online source has a typed identity, never a fake local fingerprint or unchecked URL.
alter table public.videos add column youtube_video_id text;
alter table public.videos drop constraint videos_check;
alter table public.videos add constraint videos_source_identity_check check (
  (storage_mode = 'local' and local_fingerprint is not null and youtube_video_id is null)
  or (storage_mode = 'r2' and r2_object_key is not null and youtube_video_id is null)
  or (storage_mode = 'youtube' and youtube_video_id is not null
    and youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'
    and local_fingerprint is null and r2_object_key is null)
);
create unique index videos_youtube_match_unique
  on public.videos(organization_id,match_id,youtube_video_id)
  where storage_mode = 'youtube' and match_id is not null;

create function public.freeze_online_source() returns trigger
language plpgsql set search_path=public as $$ begin
  if new.youtube_video_id is distinct from old.youtube_video_id
    or ((new.storage_mode='youtube' or old.storage_mode='youtube')
      and new.storage_mode is distinct from old.storage_mode) then
    raise exception 'Online video identity is immutable; create a new video/session';
  end if;
  return new;
end $$;
create trigger freeze_online_source before update on public.videos
for each row execute function public.freeze_online_source();
revoke all on function public.freeze_online_source() from public,anon,authenticated;
-- Existing table RLS, explicit grants, parent/context triggers, revision writes and
-- idempotent sync RPC remain authoritative and unchanged for this additive column.
