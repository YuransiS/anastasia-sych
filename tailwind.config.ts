import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0284c7",
          primaryDark: "#0369a1",
          accent: "#059669",
          light: "#f8fafc",
          card: "#ffffff",
          cardBorder: "#e2e8f0",
          muted: "#64748b",
          text: "#0f172a"
        }
      },
      fontFamily: {
        accent: ["var(--font-yeseva)", "serif"],
        serif: ["var(--font-yeseva)", "serif"],
        sans: ["var(--font-carlito)", "sans-serif"]
      }
    },
  },
  plugins: [],
};
export default config;
