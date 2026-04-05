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
        <main className="relative">{children}</main>
      </body>
    </html>
  );
}
