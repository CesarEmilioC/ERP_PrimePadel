import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0A0A0A",
          gray: "#E5E5E5",
          yellow: "#F5C518",
          orangePastel: "#FFB366",
          orange: "#FF8C42",
        },
        background: "#0A0A0A",
        foreground: "#FFFFFF",
        card: "#111111",
        border: "#1F1F1F",
        muted: "#262626",
        "muted-foreground": "#A3A3A3",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
