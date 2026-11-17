/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18251f",
        forest: "#234c3d",
        moss: "#dfe9df",
        paper: "#f7f7f2",
        muted: "#77827a",
        line: "#e6e9e2"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'DM Serif Display'", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 12px 32px rgba(25, 45, 35, 0.06)"
      }
    }
  },
  plugins: []
};
