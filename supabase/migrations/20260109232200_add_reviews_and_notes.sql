-- Add notes and user_rating to tracked_shows
ALTER TABLE tracked_shows ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tracked_shows ADD COLUMN IF NOT EXISTS user_rating FLOAT;

-- Create season_reviews table
CREATE TABLE IF NOT EXISTS season_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tracked_show_id UUID REFERENCES tracked_shows(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    rating FLOAT CHECK (rating >= 0 AND rating <= 10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tracked_show_id, season_number)
);

-- Enable RLS
ALTER TABLE season_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for season_reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'season_reviews' AND policyname = 'Users can manage their own season reviews'
    ) THEN
        CREATE POLICY "Users can manage their own season reviews"
            ON season_reviews
            FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
