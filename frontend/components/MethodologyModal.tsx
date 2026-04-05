"use client";

import { X, ShieldCheck, Train, GraduationCap, Leaf, Banknote } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const METRICS = [
  {
    label: "Safety",
    icon: ShieldCheck,
    description:
      "Calculated from Victoria Police crime incident data. Reflects reported crime rates per suburb population, including property crime, assault, and other offences.",
  },
  {
    label: "Transport",
    icon: Train,
    description:
      "Based on public transit accessibility using GTFS (General Transit Feed Specification) data. Measures proximity to bus stops, train stations, and route frequency within the suburb.",
  },
  {
    label: "Schools",
    icon: GraduationCap,
    description:
      "Combines the count of schools within suburb boundaries with average ICSEA (Index of Community Socio-Educational Advantage) scores. Reflects educational diversity and quality.",
  },
  {
    label: "Green space",
    icon: Leaf,
    description:
      "Calculated from OpenStreetMap data as the ratio of parks, gardens, and reserves to total suburb area. Higher green space contributes to livability and recreation opportunities.",
  },
  {
    label: "Affordability",
    icon: Banknote,
    description:
      "Derived from recent property sales data, representing the inverse of median property price. Higher affordability scores indicate more accessible housing markets.",
  },
];

export default function MethodologyModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">How are scores calculated?</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {METRICS.map(({ label, icon: Icon, description }) => (
            <div key={label} className="flex gap-4">
              <div className="flex-shrink-0 pt-0.5">
                <Icon size={24} className="text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{label}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}

          {/* Footer note */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600">
              <strong>Overall score</strong> is a weighted average of these five metrics, normalized to a 0–100 scale. Data is sourced from publicly available government datasets and regularly updated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
