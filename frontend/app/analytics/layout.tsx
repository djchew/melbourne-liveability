import { ReactNode } from "react";

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pt-16 pb-8 bg-surface-DEFAULT">
      <div className="max-w-7xl mx-auto px-6">
        {children}
      </div>
    </div>
  );
}
