export interface Game {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
  host_id: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  spotify_user_id: string;
  display_name: string;
  email: string;
  image_url: string;
  created_at: string;
}

export interface PlayerData {
  id: string;
  game_player_id: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string;
  token_expiration: string;
  tracks_count: number;
  artists_count: number;
  created_at: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

export interface JoinGameRequest {
  gameId: string;
  user: SpotifyUser;
  tracks: any[];
  artists: any[];
}

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GameValidationResult {
  exists: boolean;
  game?: Game;
  error?: string;
}

export type JoinState = 'idle' | 'verifying' | 'authenticating' | 'joining' | 'success' | 'error';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export interface Question {
  id: string;
  question_text: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerAnswer {
  id: string;
  game_player_id: string;
  question_id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string;
  album_image_url: string | null;
  release_year: string | null;
  external_url: string;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerAnswerWithQuestion extends PlayerAnswer {
  questions: Question;
}

export interface ExtractedTrack {
  id: string;
  game_player_id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string | null;
  album_image_url: string | null;
  release_year: string | null;
  external_url: string;
  preview_url: string | null;
  source: 'saved' | 'top';
  created_at: string;
}
