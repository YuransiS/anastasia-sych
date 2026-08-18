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
        serif: ["'Playfair Display'", "'Cormorant Garamond'", "Georgia", "serif"],
        playfair: ["'Playfair Display'", "Georgia", "serif"],
        cormorant: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Source Sans 3'", "Inter", "-apple-system", "sans-serif"],
      }
    },
  },
  plugins: [],
};
export default config;
