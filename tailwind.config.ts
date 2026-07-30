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
          yellow: "#ffdc82",
          yellowHover: "#f5cd68",
          red: "#c33624",
          redHover: "#a92b1b",
          dark: "#0b0f17",
          card: "#131924",
          cardBorder: "#222c3d",
          muted: "#8e9bb0",
          text: "#e8ecf4"
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
