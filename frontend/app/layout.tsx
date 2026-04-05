import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Melbourne Liveability Index",
  description: "Explore and compare liveability scores across Greater Melbourne suburbs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-slate-900 antialiased">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-3 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="6" r="3" fill="white"/>
              <path d="M7 14 C7 14 2 9 2 6 A5 5 0 0 1 12 6 C12 9 7 14 7 14Z" stroke="white" strokeWidth="1.2" fill="none"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 leading-none">Melbourne Liveability</h1>
            <p className="text-xs text-slate-400 mt-0.5">Greater Melbourne · suburb scores</p>
          </div>
        </header>
        <main className="relative">{children}</main>
      </body>
    </html>
  );
}
