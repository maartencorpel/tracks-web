import { createClient } from '@supabase/supabase-js'
import { Game, GamePlayer, PlayerData } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export class SupabaseService {
  static async checkGameExists(gameId: string): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (error || !data) {
      return null
    }

    return data as Game
  }

  static async joinGame(gameId: string, spotifyUser: any, accessToken: string, refreshToken?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First, insert the game player
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .insert({
          game_id: gameId,
          spotify_user_id: spotifyUser.id,
          display_name: spotifyUser.display_name,
          email: spotifyUser.email,
          image_url: spotifyUser.images?.[0]?.url || null,
        })
        .select()
        .single()

      if (playerError) {
        return { success: false, error: playerError.message }
      }

      // Then, insert the player data
      // TODO: Implement actual encryption before production deployment
      // Currently storing tokens in plaintext - this is a security risk
      const { error: dataError } = await supabase
        .from('player_data')
        .insert({
          game_player_id: playerData.id,
          encrypted_access_token: accessToken, // TODO: Encrypt before storing
          encrypted_refresh_token: refreshToken || null, // TODO: Encrypt before storing
          token_expiration: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          tracks_count: 0,
          artists_count: 0,
        })

      if (dataError) {
        return { success: false, error: dataError.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}