import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Melbourne Liveability Index",
  description: "Explore and compare liveability scores across Greater Melbourne suburbs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-slate-100 antialiased">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-surface/80 backdrop-blur border-b border-surface-border">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Melbourne Liveability</h1>
            <p className="text-xs text-slate-400">Greater Melbourne suburb scores</p>
          </div>
        </header>
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
