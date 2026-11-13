import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Trash Tracker",
  description: "Track whose turn it is to take out the trash",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Tints the phone browser's address bar. Hex versions of --primary (light)
  // and a deeper green that sits better against the dark theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#49794a" },
    { media: "(prefers-color-scheme: dark)", color: "#1d341e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-[env(safe-area-inset-bottom)]">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
