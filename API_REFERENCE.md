# Spot Join - API Reference

## Table of Contents

1. [Internal API Routes](#internal-api-routes)
2. [External Integrations](#external-integrations)
3. [Environment Variables](#environment-variables)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)

---

## Internal API Routes

### POST /api/spotify/token

Exchanges Spotify authorization code for access and refresh tokens.

**Request Body:**
```typescript
{
  code: string;           // Authorization code from Spotify
  redirect_uri: string;   // Redirect URI used in OAuth flow
}
```

**Response:**
```typescript
{
  access_token: string;    // Spotify access token
  refresh_token?: string;  // Spotify refresh token (optional)
  expires_in: number;      // Token expiration time in seconds
  token_type: string;      // Always "Bearer"
  scope: string;          // Granted scopes
}
```

**Error Responses / Protections:**
- `400 Bad Request` - Invalid request body or redirect URI not on allowlist
- `401 Unauthorized` - Invalid authorization code
- `429 Too Many Requests` - Rate limit exceeded (5 req/min per IP)
- `500 Internal Server Error` - Server-side error

**Implementation:**
```typescript
export async function POST(request: NextRequest) {
  const { code, redirect_uri } = await request.json()
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }
  
  return response.json()
}
```

---

## External Integrations

### Spotify OAuth 2.0

#### Authorization Endpoint
```
GET https://accounts.spotify.com/authorize
```

**Parameters:**
- `client_id` - Spotify application client ID
- `response_type` - Always "code"
- `redirect_uri` - Callback URL
- `scope` - Requested permissions
- `state` - Game ID for CSRF protection

**Scopes:**
- `user-top-read` - Access to user's top tracks and artists
- `user-read-email` - User's email address
- `user-read-private` - User's subscription type

#### Token Exchange
```
POST https://accounts.spotify.com/api/token
```

**Parameters:**
- `grant_type` - "authorization_code"
- `code` - Authorization code (validated for length)
- `redirect_uri` - Must match one of the values in `SPOTIFY_REDIRECT_URI_ALLOWLIST`
- `client_id` - Spotify application client ID
- `client_secret` - Spotify application client secret
- `state` - Game code (validated server-side)

### Spotify Web API

#### Get Current User
```
GET https://api.spotify.com/v1/me
Authorization: Bearer {access_token}
```

**Response:**
```typescript
{
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  country?: string;
  product?: 'free' | 'premium';
}
```

### Supabase Integration

#### Database Tables

**games**
```sql
CREATE TABLE games (
  id VARCHAR(6) PRIMARY KEY,
  host_device_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

**game_players**
```sql
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(6) REFERENCES games(id),
  spotify_user_id VARCHAR(255),
  display_name VARCHAR(255),
  email VARCHAR(255),
  image_url TEXT,
  joined_at TIMESTAMP DEFAULT NOW()
);
```

**player_data**
```sql
CREATE TABLE player_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_player_id UUID REFERENCES game_players(id),
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  token_expiration TIMESTAMP,
  tracks_count INTEGER DEFAULT 0,
  artists_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Supabase Operations

**Check Game Exists**
```typescript
const { data, error } = await supabase
  .from('games')
  .select('*')
  .eq('id', gameId)
  .single()
```

**Join Game**
```typescript
// Insert player
const { data: playerData } = await supabase
  .from('game_players')
  .insert({
    game_id: gameId,
    spotify_user_id: user.id,
    display_name: user.display_name,
    email: user.email,
    image_url: user.images?.[0]?.url
  })
  .select()
  .single()

// Insert token data
await supabase
  .from('player_data')
  .insert({
    game_player_id: playerData.id,
    encrypted_access_token: tokens.access_token,
    encrypted_refresh_token: tokens.refresh_token,
    token_expiration: new Date(Date.now() + tokens.expires_in * 1000)
  })
```

---

## Environment Variables

### Required Variables

**Supabase Configuration**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Spotify Configuration**
```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://your-domain.com/callback
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI_ALLOWLIST=https://your-domain.com/callback,https://staging.your-domain.com/callback
```

### Development vs Production

**Development:**
```env
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

**Production:**
```env
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://spot-join-web.vercel.app/callback
```

### Security Considerations

- ✅ `NEXT_PUBLIC_*` variables are safe to expose client-side
- ✅ `SPOTIFY_CLIENT_SECRET` must never be exposed client-side
- ⚠️ Store sensitive variables in Vercel environment settings
- ⚠️ Use different values for development and production

---

## Data Models

### Core Types

```typescript
// Game model
interface Game {
  id: string;                    // 4-character game code
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;            // ISO timestamp
  host_id: string;              // Host device ID
}

// Player model
interface GamePlayer {
  id: string;                   // UUID
  game_id: string;              // References games.id
  spotify_user_id: string;      // Spotify user ID
  display_name: string;         // User's display name
  email: string;               // User's email
  image_url: string;           // Profile image URL
  created_at: string;          // ISO timestamp
}

// Token data model
interface PlayerData {
  id: string;                   // UUID
  game_player_id: string;       // References game_players.id
  encrypted_access_token: string;  // Spotify access token
  encrypted_refresh_token?: string; // Spotify refresh token
  token_expiration: string;     // ISO timestamp
  tracks_count: number;         // Number of tracks fetched
  artists_count: number;        // Number of artists fetched
  created_at: string;          // ISO timestamp
}

// Spotify user model
interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  country?: string;
  product?: 'free' | 'premium';
}

// Token response model
interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;           // Seconds until expiration
  token_type: string;          // Always "Bearer"
  scope: string;               // Granted scopes
}
```

### State Management Types

```typescript
// Join flow state
type JoinState = 'idle' | 'verifying' | 'authenticating' | 'joining' | 'success' | 'error';

// Game validation result
interface GameValidationResult {
  exists: boolean;
  game?: Game;
  error?: string;
}

// API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## Error Handling

### Error Types

```typescript
// Custom error classes
export class GameNotFoundError extends Error {
  constructor(gameId: string) {
    super(`Game ${gameId} not found`);
    this.name = 'GameNotFoundError';
  }
}

export class SpotifyAuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SpotifyAuthError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(`Network error: ${message}`);
    this.name = 'NetworkError';
  }
}
```

### Error Response Format

```typescript
// Standardized error response
interface ErrorResponse {
  error: string;                // Human-readable error message
  code?: string;               // Error code for programmatic handling
  details?: any;               // Additional error details
  timestamp: string;           // ISO timestamp
}
```

### Common Error Scenarios

**Game Not Found**
```typescript
{
  error: "This game code doesn't exist. Please check the code and try again.",
  code: "GAME_NOT_FOUND",
  timestamp: "2024-01-15T10:30:00Z"
}
```

**Network Error**
```typescript
{
  error: "Unable to verify the game. Please check your internet connection and try again.",
  code: "NETWORK_ERROR",
  timestamp: "2024-01-15T10:30:00Z"
}
```

**Authentication Error**
```typescript
{
  error: "Failed to authenticate with Spotify. Please try again.",
  code: "SPOTIFY_AUTH_ERROR",
  details: { spotify_code: "invalid_grant" },
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Error Handling Best Practices

1. **User-Friendly Messages**: Always provide actionable error messages
2. **Error Codes**: Include error codes for programmatic handling
3. **Retry Logic**: Implement retry mechanisms for transient errors
4. **Logging**: Log errors with context for debugging
5. **Fallbacks**: Provide fallback actions when possible

---

## Rate Limiting

### Current Implementation
- No rate limiting implemented
- Vulnerable to abuse and DoS attacks

### Recommended Implementation
```typescript
// Rate limiting by IP address
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  // Implementation details in IMPROVEMENTS.md
}
```

### Rate Limit Recommendations
- **Token Exchange**: 5 requests per minute per IP
- **Game Validation**: 20 requests per minute per IP
- **General API**: 100 requests per minute per IP

---

This API reference provides comprehensive documentation for all endpoints, integrations, and data models used in the Spot Join web application. For implementation details, refer to the source code and technical guide.
