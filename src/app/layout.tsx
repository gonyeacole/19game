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

// iOS's "Add to Home Screen" bookmark (not a real installed PWA — just
// apple-mobile-web-app-capable) has a long history of dvh/vh not matching
// the actual visible screen height in that specific context, leaving a
// gap of bare system background below content sized with height:100dvh.
// Measuring window.innerHeight directly in JS sidesteps that entirely.
const APP_HEIGHT_SCRIPT = `
(function () {
  function setAppHeight() {
    document.documentElement.style.setProperty("--app-height", window.innerHeight + "px");
  }
  setAppHeight();
  window.addEventListener("resize", setAppHeight);
  window.addEventListener("orientationchange", setAppHeight);

  // The (display-mode: standalone) media query should catch this too, but
  // navigator.standalone (Safari's own iOS-specific flag) is the more
  // battle-tested check for "launched from an Add to Home Screen bookmark".
  var standalone =
    window.navigator.standalone === true ||
    matchMedia("(display-mode: standalone)").matches;
  if (standalone) document.documentElement.dataset.standalone = "true";
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: APP_HEIGHT_SCRIPT }} />
      </head>
      <body
        className="flex h-dvh flex-col overflow-hidden bg-field text-chalk"
        style={{ height: "var(--app-height, 100dvh)" }}
      >
        <header className="safe-top z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-field px-4 pb-3">
          <div className="justify-self-start">
            <AddToHomeScreen />
          </div>
          <span className={`${leagueGothic.className} justify-self-center text-3xl leading-none tracking-wide text-led`}>
            19League
          </span>
          <div className="flex items-center justify-self-end gap-2">
            <ThemeToggle />
            <RefreshButton />
          </div>
        </header>
        <main id="scroll-main" className="flex-1 overflow-y-auto">
          {children}
        </main>
        <TabNav />
      </body>
    </html>
  );
}
