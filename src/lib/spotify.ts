export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
export const SPOTIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!

export const getSpotifyAuthUrl = (gameId: string) => {
  const scopes = 'user-top-read user-read-email user-read-private'
  return `https://accounts.spotify.com/authorize?` +
    `client_id=${SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${gameId}`
}

export const generateSpotifyAuthUrl = getSpotifyAuthUrl

export const openApp = (gameId: string) => {
  const deepLink = `spot://join?game=${gameId}`
  window.location.href = deepLink
}

export const generateDeepLink = (gameId: string) => {
  return `spot://join?game=${gameId}`
}

export const exchangeCodeForToken = async (code: string, redirectUri: string) => {
  const response = await fetch('/api/spotify/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}

export const fetchSpotifyUser = async (accessToken: string) => {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Spotify user')
  }

  return response.json()
}