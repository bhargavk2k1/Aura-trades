import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0a0e1a",
          card: "#111827",
          border: "#1f2937",
          accent: "#3b82f6",
          gain: "#10b981",
          loss: "#ef4444",
          muted: "#6b7280"
        }
      }
    }
  },
  plugins: []
};

export default config;
