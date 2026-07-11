/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "sans-serif"],
        serif: ["'Instrument Serif'", "serif"],
      },
      colors: {
        neutral: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        brand: {
          50: "#f7f7f8",
          100: "#ededee",
          200: "#d9d9dc",
          300: "#b9b9be",
          400: "#8f8f98",
          500: "#707078",
          600: "#525258",
          700: "#3a3a3f",
          800: "#252529",
          900: "#171719",
        },
      },
    },
  },
  plugins: [],
};
