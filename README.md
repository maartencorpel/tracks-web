# Spot Join Website

A modern Next.js website for joining Spot games. This website allows users to join Spotify-based games through a web interface with OAuth authentication.

## 🚀 Features

- **Next.js 15** with TypeScript for type safety
- **Shadcn/UI** components for modern, accessible UI
- **Tailwind CSS** for responsive design
- **Spotify OAuth** integration with proper error handling
- **Supabase** integration for game management
- **Mobile-optimized** design
- **Deep linking** support for iOS app integration

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI
- **Backend**: Supabase
- **Authentication**: Spotify OAuth 2.0
- **Deployment**: Vercel (recommended)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/maartencorpel/spot-join-website.git
   cd spot-join-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your actual credentials.

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Spotify Configuration
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# Spotify API (Server-side)
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set the environment variables in Vercel dashboard
3. Deploy automatically on every push to main

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## 📱 Usage

1. **Game Host**: Creates a game in the iOS app and shares the join link
2. **Game Joiner**: Visits the website with the game code
3. **Authentication**: User authenticates with Spotify
4. **Game Join**: User is added to the game and can participate

## 🔗 Integration

This website integrates with:
- **iOS App**: Deep linking support (`spot://join?game=ABC123`)
- **Spotify API**: User authentication and data access
- **Supabase**: Game state and player management

## 📄 License

This project is part of the Spot game ecosystem.
