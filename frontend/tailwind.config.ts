import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        brand: {
          50: "#f7f1f9",
          100: "#e8d6ed",
          200: "#d7bce0",
          300: "#b56bc0",
          400: "#a44bb2",
          500: "#9635a3",
          600: "#7c1e8b",
          700: "#6a1a78",
          800: "#591661",
          900: "#4e1e52",
          950: "#2f0f32",
        },
        accent: {
          50: "#f7f1f9",
          100: "#e8d6ed",
          200: "#d7bce0",
          300: "#c78fd2",
          400: "#b56bc0",
          500: "#a44bb2",
          600: "#9635a3",
          700: "#7c1e8b",
          800: "#5a1765",
          900: "#4e1e52",
          950: "#2f0f32",
        },
        canvas: "#f7f1f9",
        ink: "#4e1e52",
        muted: "#7a5c7e",
        line: "#e8d6ed",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(78,30,82,0.05), 0 8px 24px -12px rgba(78,30,82,0.16)",
        pop: "0 20px 50px -20px rgba(78,30,82,0.4)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "scale-in": "scale-in 150ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
