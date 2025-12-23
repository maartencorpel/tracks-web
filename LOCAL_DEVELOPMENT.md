# Local Development Setup Guide

This guide will help you set up localhost development so you can test changes without committing and pushing every time.

## Quick Start

1. **Install dependencies** (if you haven't already):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your actual credentials (see below).

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000`

The development server will automatically reload when you make changes to your code!

## Environment Variables Setup

### Step 1: Copy the example file
```bash
cp .env.example .env.local
```

### Step 2: Get your credentials

#### Supabase Credentials
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Spotify Credentials
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app (or create a new one)
3. Copy:
   - **Client ID** → `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`
   - **Client Secret** → `SPOTIFY_CLIENT_SECRET` (click "Show Client Secret")

#### Spotify Redirect URI Setup
**Important**: You need to add `http://localhost:3000/callback` to your Spotify app's redirect URIs:

1. In Spotify Developer Dashboard, go to your app
2. Click **Edit Settings**
3. Under **Redirect URIs**, add:
   ```
   http://localhost:3000/callback
   ```
4. Click **Add** and **Save**

### Step 3: Edit `.env.local`

Open `.env.local` and fill in your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key

# Spotify Configuration
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_actual_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# Spotify API (Server-side only)
SPOTIFY_CLIENT_SECRET=your_actual_client_secret

# Security - Include localhost for local development
SPOTIFY_REDIRECT_URI_ALLOWLIST=http://localhost:3000/callback,https://your-production-domain.com/callback
```

## Development Workflow

### Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

### Hot Reload
Next.js automatically reloads when you save changes to:
- React components (`.tsx`, `.jsx`)
- Pages (files in `src/app/`)
- API routes (files in `src/app/api/`)
- Styles (`.css` files)

### Stop the Server
Press `Ctrl+C` in the terminal where the server is running.

## Available Scripts

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server (after building)
npm run start

# Run linting
npm run lint
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, Next.js will automatically try the next available port (3001, 3002, etc.). Check the terminal output for the actual URL.

To use a specific port:
```bash
PORT=3001 npm run dev
```

### Environment Variables Not Loading
1. Make sure `.env.local` is in the root directory (same level as `package.json`)
2. Restart the development server after changing `.env.local`
3. Variables starting with `NEXT_PUBLIC_` are available in the browser
4. Other variables are only available server-side

### Spotify OAuth Not Working Locally
1. Verify `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback` in `.env.local`
2. Make sure `http://localhost:3000/callback` is added to your Spotify app's redirect URIs
3. Check that `SPOTIFY_REDIRECT_URI_ALLOWLIST` includes `http://localhost:3000/callback`

### Database Connection Issues
1. Verify your Supabase URL and anon key are correct
2. Check that your Supabase project is active
3. Ensure Row Level Security (RLS) policies are set up correctly

## Tips

- **Never commit `.env.local`** - It's already in `.gitignore`
- **Use different Spotify apps** for development and production if possible
- **Keep your client secret secure** - Never expose it in client-side code
- **Test OAuth flow** - Make sure the full Spotify authentication flow works locally

## Next Steps

Once you have localhost working:
1. Test the full user flow (join game → Spotify auth → select tracks)
2. Make your UI changes
3. Test them immediately in the browser
4. Commit and push when you're happy with the changes

Happy coding! 🚀

