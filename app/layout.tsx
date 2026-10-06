import type { Metadata } from "next";
import "./globals.css";
import "./analyst-console.css";

export const metadata: Metadata = {
  title: "HBI — Handball Intelligence",
  description:
    "Video-first handball intelligence for coaches and technical staff.",
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
