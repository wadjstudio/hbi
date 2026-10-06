-- Commit the enum extension before 0018 uses it (PostgreSQL enum transaction rule).
alter type public.video_storage_mode add value if not exists 'youtube';
