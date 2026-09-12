import type { Metadata } from "next";
import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
import RefreshButton from "@/components/RefreshButton";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import "./globals.css";

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
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-field/95 backdrop-blur px-4 py-3">
          <ThemeToggle />
          {/* Real Helvetica Compressed is a paid, non-web font — this
              approximates it by squeezing plain Helvetica/Arial horizontally. */}
          <span
            className="font-sans text-2xl font-bold leading-none text-led"
            style={{ transform: "scaleX(0.8)", display: "inline-block" }}
          >
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
