import { NextResponse } from 'next/server';

// Apple App Site Association file for Universal Links
// This enables the iOS app to open links from spot-join-web.vercel.app
export async function GET() {
  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          // TODO: Replace YOUR_TEAM_ID with your actual Apple Team ID
          // Find it at: https://developer.apple.com -> Membership
          appID: "YOUR_TEAM_ID.com.yourcompany.Spot",
          paths: ["/return", "/spotify-play", "/join"]
        }
      ]
    }
  };

  return NextResponse.json(aasa, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}