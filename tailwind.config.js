/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dark navy background palette
        background: "#0f172a",
        surface: "#1e293b",
        "surface-2": "#334155",
        border: "#475569",
        // Accent
        primary: "#6366f1",
        "primary-dark": "#4f46e5",
        // Semantic
        positive: "#22c55e",
        negative: "#ef4444",
        warning: "#f59e0b",
        muted: "#94a3b8",
        // Text
        "text-primary": "#f1f5f9",
        "text-secondary": "#94a3b8",
      },
    },
  },
  plugins: [],
};
