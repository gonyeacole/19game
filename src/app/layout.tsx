import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import TabNav from "@/components/TabNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exactly 19 Pool",
  description: "NFL Exactly 19 pool — scores, pot, and payments",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-white/95 backdrop-blur px-4 py-3 dark:border-white/10 dark:bg-black/90">
          <h1 className="text-center text-lg font-bold tracking-tight">
            🎯 Exactly 19 Pool
          </h1>
        </header>
        <main className="flex-1 pb-20">{children}</main>
        <TabNav />
      </body>
    </html>
  );
}
