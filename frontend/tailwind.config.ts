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
          DEFAULT: "#0f172a",  // dark navy background
          card:    "#1e293b",
          border:  "#334155",
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
