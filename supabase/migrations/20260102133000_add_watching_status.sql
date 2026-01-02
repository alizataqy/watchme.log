ALTER TABLE public.tracked_shows DROP CONSTRAINT IF EXISTS tracked_shows_track_status_check;

ALTER TABLE public.tracked_shows ADD CONSTRAINT tracked_shows_track_status_check 
CHECK (track_status IN ('watchlist', 'watched', 'watching'));
