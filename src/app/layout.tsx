import type { Metadata } from "next";
import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
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
          <div className="w-8" />
          <div className="rounded-md border border-line bg-panel-2 px-3 py-1">
            <span className="font-mono text-lg font-extrabold tracking-widest text-led drop-shadow-[0_0_6px_var(--color-led)]">
              19{" "}
              <span className="text-sm tracking-[0.2em]">LEAGUE</span>
            </span>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 pb-20">{children}</main>
        <TabNav />
      </body>
    </html>
  );
}
