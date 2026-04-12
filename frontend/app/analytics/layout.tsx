import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900 hover:text-cyan-600 transition-colors duration-200">
            Melbourne Liveability
          </Link>
          <nav>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-slate-100"
              title="Return to map"
            >
              <ArrowLeft size={16} />
              Map
            </Link>
          </nav>
        </div>
      </header>
      <div className="min-h-screen pb-8 bg-white animate-fade-in">
        <div className="max-w-7xl mx-auto px-6 pt-8">
          {children}
        </div>
      </div>
    </>
  );
}
