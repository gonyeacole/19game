import type { Metadata } from "next";
import TabNav from "@/components/TabNav";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-field text-chalk">
        <header className="sticky top-0 z-10 border-b border-line bg-field/95 backdrop-blur px-4 py-3">
          <h1 className="flex items-center justify-center gap-2 text-base font-bold uppercase tracking-wide">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              className="shrink-0"
            >
              <circle cx="10" cy="10" r="8" />
              <circle cx="10" cy="10" r="4.2" />
              <line x1="10" y1="0.6" x2="10" y2="4" />
              <line x1="10" y1="16" x2="10" y2="19.4" />
              <line x1="0.6" y1="10" x2="4" y2="10" />
              <line x1="16" y1="10" x2="19.4" y2="10" />
            </svg>
            Exactly 19 Pool
          </h1>
        </header>
        <main className="flex-1 pb-20">{children}</main>
        <TabNav />
      </body>
    </html>
  );
}
