import type { Metadata } from "next";
import localFont from "next/font/local";
import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
import RefreshButton from "@/components/RefreshButton";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import "./globals.css";

const leagueGothic = localFont({
  src: "../fonts/LeagueGothic-Regular.ttf",
  weight: "400",
});

export const metadata: Metadata = {
  title: "19 League",
  description: "NFL Exactly 19 pool — scores, pot, and payments",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "19 League",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Without this, iOS never reports real env(safe-area-inset-*) values —
  // they silently resolve to 0, so TabNav's safe-area padding does nothing
  // once the app is added to the home screen and runs edge-to-edge.
  viewportFit: "cover",
};

// Runs before paint so the right theme applies immediately — avoids a
// flash of the wrong theme while React hydrates.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-field text-chalk">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-field/95 backdrop-blur px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <ThemeToggle />
          <span className={`${leagueGothic.className} text-3xl leading-none tracking-wide text-led`}>
            19League
          </span>
          <RefreshButton />
        </header>
        <main className="flex-1 pb-28">
          {children}
          <AddToHomeScreen />
        </main>
        <TabNav />
      </body>
    </html>
  );
}
