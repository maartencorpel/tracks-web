import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Join Spot Game",
  description: "Connect with friends and discover music together in Spot games",
  keywords: ["Spot", "Spotify", "Music", "Game", "Social"],
  authors: [{ name: "Spot Team" }],
  robots: "noindex, nofollow", // Prevent indexing of join pages
  openGraph: {
    title: "Join Spot Game",
    description: "Connect with friends and discover music together",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
