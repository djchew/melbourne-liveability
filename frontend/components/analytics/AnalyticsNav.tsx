"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, TrendingUp, Shuffle, AlertCircle } from "lucide-react";

export default function AnalyticsNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/analytics", label: "Overview", icon: <Activity size={16} /> },
    { href: "/analytics/comparison", label: "Compare", icon: <Shuffle size={16} /> },
    { href: "/analytics/metrics", label: "Metrics", icon: <TrendingUp size={16} /> },
    { href: "/analytics/insights", label: "Insights", icon: <AlertCircle size={16} /> },
  ];

  return (
    <div className="flex gap-2 border-b border-slate-200 mb-8">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium transition-colors ${
            pathname === item.href
              ? "bg-white text-cyan-700 border-b-2 border-cyan-500"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </div>
  );
}
