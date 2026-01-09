-- Create notification_logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('upcoming', 'unwatched', 'inactive')),
  show_id INTEGER NOT NULL,
  show_name TEXT NOT NULL,
  message TEXT NOT NULL,
  episode_info JSONB, -- Store season, episode, name, airdate
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  unique_key TEXT NOT NULL, -- e.g. "inactive-1396-2026-01-09" for deduplication
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, unique_key)
);

-- Create indexes for better performance
CREATE INDEX idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);
CREATE INDEX idx_notification_logs_unique_key ON public.notification_logs(user_id, unique_key);
CREATE INDEX idx_notification_logs_show_id ON public.notification_logs(show_id);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification logs"
ON public.notification_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification logs"
ON public.notification_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification logs"
ON public.notification_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Function to clean old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notification_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a scheduled job to cleanup old notifications
-- This requires pg_cron extension, uncomment if you have it enabled
-- SELECT cron.schedule('cleanup-old-notifications', '0 0 * * *', 'SELECT public.cleanup_old_notifications()');
