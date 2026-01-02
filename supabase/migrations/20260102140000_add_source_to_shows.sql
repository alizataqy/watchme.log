ALTER TABLE public.tracked_shows ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'tvmaze';
ALTER TABLE public.tracked_shows ADD COLUMN IF NOT EXISTS is_movie BOOLEAN NOT NULL DEFAULT false;

-- Drop old unique constraint if exists (name might vary, trying standard generated name and specific name from prev migration)
ALTER TABLE public.tracked_shows DROP CONSTRAINT IF EXISTS tracked_shows_user_id_show_id_key;

-- Add new unique constraint combining user_id, show_id, and source
ALTER TABLE public.tracked_shows ADD CONSTRAINT tracked_shows_user_id_show_id_source_key UNIQUE (user_id, show_id, source);
