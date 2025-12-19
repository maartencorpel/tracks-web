import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Join Tracks Game",
  description: "Connect with friends and discover music together in Tracks games",
  keywords: ["Tracks", "Spotify", "Music", "Game", "Social"],
  authors: [{ name: "Tracks Team" }],
  robots: "noindex, nofollow", // Prevent indexing of join pages
  openGraph: {
    title: "Join Tracks Game",
    description: "Connect with friends and discover music together",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
