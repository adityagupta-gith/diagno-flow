import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#090d16",
          900: "#0f172a",
          850: "#131c31",
          800: "#1e293b",
          700: "#334155",
        },
        primary: {
          500: "#3b82f6",
          600: "#2563eb",
        },
        triage: {
          critical: "#ef4444",
          high: "#f97316",
          moderate: "#eab308",
          low: "#10b981",
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-spin': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
};
export default config;
