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
          teal: "#00c8b7",
          tealBright: "#01dac7",
          tealGlow: "rgba(0, 200, 183, 0.3)",
          coral: "#fe451d",
          coralDark: "#c82901",
          dark: "#050505",
          card: "#121212",
          cardBorder: "#242424",
          muted: "#a0a0a0",
          text: "#f5f5f5"
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
