# Security Setup Guide - Simple Instructions

## What Was Done

I've added security improvements to your mobile authentication website. Here's what changed:

1. **Rate Limiting** - Prevents abuse of the token exchange API (5 requests per minute per IP)
2. **Input Validation** - Validates game codes and OAuth data before processing
3. **Safe Storage** - Fixed localStorage usage to prevent errors
4. **Security Headers** - Added HTTP security headers to protect your site
5. **Redirect URI Protection** - Only allows approved redirect URIs

## What You Need To Do

### Step 1: Review the Changes

All the code changes are ready. You can see them with:
```bash
cd tracks-web
git status
```

### Step 2: Test Locally (Optional but Recommended)

1. Make sure you're in the project folder:
   ```bash
   cd tracks-web
   ```

2. Install dependencies (if you haven't recently):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000` and test:
   - Enter a game code (should validate format)
   - Try the OAuth flow
   - Check that everything works

### Step 3: Add Environment Variable (IMPORTANT)

You need to add one new environment variable for production:

**For Vercel (if you're using it):**
1. Go to your Vercel project dashboard
2. Click on "Settings" → "Environment Variables"
3. Add a new variable:
   - **Name**: `SPOTIFY_REDIRECT_URI_ALLOWLIST`
   - **Value**: Your production callback URL(s), comma-separated
     - Example: `https://your-domain.com/callback,https://staging.your-domain.com/callback`
   - **Environment**: Production (and Preview if you want)

**For Local Development:**
Create or update `.env.local` file in the `tracks-web` folder:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI_ALLOWLIST=http://localhost:3000/callback
```

### Step 4: Commit and Push Changes

When you're ready to save these changes:

```bash
# See what changed
git status

# Add all the new files and changes
git add .

# Commit with a message
git commit -m "Add security improvements: rate limiting, validation, and security headers"

# Push to GitHub
git push origin main
```

If you're using Vercel, it will automatically deploy after you push.

### Step 5: Verify It Works

After deploying:
1. Visit your production site
2. Try joining a game
3. Check that the OAuth flow still works
4. If something breaks, check the browser console (F12) for errors

## What If Something Breaks?

1. **Check the browser console** (Press F12, go to Console tab) for error messages
2. **Check Vercel logs** (if using Vercel) in the deployment dashboard
3. **Revert if needed**: 
   ```bash
   git restore .
   git push origin main
   ```

## Files Changed

- `src/lib/rate-limit.ts` - NEW: Rate limiting helper
- `src/lib/browser-storage.ts` - NEW: Safe localStorage wrapper
- `src/lib/validation.ts` - NEW: Input validation functions
- `src/app/api/spotify/token/route.ts` - Updated: Added rate limiting and validation
- `src/app/page.tsx` - Updated: Added validation for game codes
- `src/app/callback/page.tsx` - Updated: Added validation and safe storage
- `src/app/success/page.tsx` - Updated: Uses safe storage
- `next.config.js` - Updated: Added security headers
- Documentation files updated with new environment variable info

## Questions?

- The rate limiter allows 5 requests per minute per IP address
- Game codes must be exactly 4 characters, numbers only
- The redirect URI allowlist prevents unauthorized redirects
- All localStorage access is now safe and won't crash on server-side rendering

Everything should work the same as before, but now it's more secure!

