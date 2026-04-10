interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: "cyan" | "orange" | "slate";
  trend?: number;
}

export default function StatCard({
  label,
  value,
  icon,
  accent = "cyan",
  trend,
}: StatCardProps) {
  const accentClasses = {
    cyan: "border-l-4 border-cyan-500 from-cyan-50 to-transparent",
    orange: "border-l-4 border-orange-500 from-orange-50 to-transparent",
    slate: "border-l-4 border-slate-400 from-slate-50 to-transparent",
  };

  return (
    <div className={`bg-gradient-to-br ${accentClasses[accent]} rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {trend !== undefined && (
            <p className={`text-xs font-medium mt-2 ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% from previous
            </p>
          )}
        </div>
        {icon && <div className="text-2xl opacity-60">{icon}</div>}
      </div>
    </div>
  );
}
