import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./analyst-console.css";
import "./sesen.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://hbi.wadj.online",
  ),
  title: "SESEN — Handball Intelligence",
  applicationName: "SESEN",
  description:
    "Video-first handball intelligence for coaches and technical staff.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/brand/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      {
        url: "/brand/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "SESEN",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "SESEN — Handball Intelligence",
    type: "website",
    images: [
      {
        url: "/brand/social-card.png",
        width: 1200,
        height: 630,
        alt: "SESEN Sports Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SESEN — Handball Intelligence",
    images: ["/brand/social-card.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#080E12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
