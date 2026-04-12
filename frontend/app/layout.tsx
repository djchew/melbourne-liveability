import type { Metadata } from "next";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Melbourne Liveability Index",
  description: "Explore and compare liveability scores across Greater Melbourne suburbs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <PageTransition>
          <main className="relative">{children}</main>
        </PageTransition>
      </body>
    </html>
  );
}
