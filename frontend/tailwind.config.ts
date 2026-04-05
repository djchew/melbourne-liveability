import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Score colour scale — low to high liveability
        score: {
          low:    "#ef4444",   // red
          mid:    "#f97316",   // orange
          good:   "#eab308",   // yellow
          high:   "#22c55e",   // green
          best:   "#06b6d4",   // cyan
        },
        surface: {
          DEFAULT: "#f8fafc",  // slate-50 background
          card:    "#ffffff",
          border:  "#e2e8f0",  // slate-200
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
