import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
import RefreshButton from "@/components/RefreshButton";
import "./globals.css";

// Pixel/dot-matrix face — the actual font family real stadium scoreboards
// are built from, unlike a bolded system font with a glow slapped on.
const silkscreen = Silkscreen({ weight: "700", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Exactly 19 Pool",
  description: "NFL Exactly 19 pool — scores, pot, and payments",
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
          <div className="flex items-baseline gap-1.5 rounded-sm border-2 border-[#3a3a3a] bg-black px-3 py-1 shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]">
            <span
              className={`${silkscreen.className} text-xl leading-none text-led drop-shadow-[0_0_5px_var(--color-led)] drop-shadow-[0_0_10px_var(--color-led)]`}
            >
              19
            </span>
            <span
              className={`${silkscreen.className} text-xl leading-none tracking-[0.15em] text-led drop-shadow-[0_0_5px_var(--color-led)] drop-shadow-[0_0_10px_var(--color-led)]`}
            >
              LEAGUE
            </span>
          </div>
          <RefreshButton />
        </header>
        <main className="flex-1 pb-20">{children}</main>
        <TabNav />
      </body>
    </html>
  );
}
