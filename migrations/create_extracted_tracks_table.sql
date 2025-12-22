-- Create extracted_tracks table for storing player's extracted Spotify tracks
-- This table stores tracks fetched from Spotify (saved tracks + top tracks)
-- filtered to the past year, for use in track selection UI

CREATE TABLE IF NOT EXISTS extracted_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  track_id VARCHAR(255) NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  album_image_url TEXT,
  release_year VARCHAR(4),
  external_url TEXT NOT NULL,
  preview_url TEXT,
  source VARCHAR(10) NOT NULL CHECK (source IN ('saved', 'top')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(game_player_id, track_id)
);

-- Create index for faster lookups by game_player_id
CREATE INDEX IF NOT EXISTS idx_extracted_tracks_game_player_id 
ON extracted_tracks(game_player_id);

-- Enable Row Level Security (RLS)
ALTER TABLE extracted_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for authenticated users
-- This allows the client-side code to insert/update/delete tracks
-- In production, you may want to restrict this further based on game_player_id ownership
CREATE POLICY "Allow authenticated users to manage extracted tracks"
ON extracted_tracks
FOR ALL
USING (true)
WITH CHECK (true);
