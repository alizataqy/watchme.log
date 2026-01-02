-- Create tracked_shows table
CREATE TABLE public.tracked_shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  premiered TEXT,
  ended TEXT,
  status TEXT,
  genres TEXT[],
  rating DECIMAL,
  summary TEXT,
  track_status TEXT NOT NULL DEFAULT 'watchlist' CHECK (track_status IN ('watchlist', 'watched')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, show_id)
);

-- Create watched_episodes table for episode tracking
CREATE TABLE public.watched_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracked_show_id UUID NOT NULL REFERENCES public.tracked_shows(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  episode_name TEXT,
  airdate TEXT,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tracked_show_id, season, episode)
);

-- Enable RLS
ALTER TABLE public.tracked_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watched_episodes ENABLE ROW LEVEL SECURITY;

-- RLS policies for tracked_shows
CREATE POLICY "Users can view their own tracked shows"
ON public.tracked_shows
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked shows"
ON public.tracked_shows
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked shows"
ON public.tracked_shows
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked shows"
ON public.tracked_shows
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for watched_episodes
CREATE POLICY "Users can view their own watched episodes"
ON public.watched_episodes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watched episodes"
ON public.watched_episodes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watched episodes"
ON public.watched_episodes
FOR DELETE
USING (auth.uid() = user_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tracked_shows
CREATE TRIGGER update_tracked_shows_updated_at
BEFORE UPDATE ON public.tracked_shows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();