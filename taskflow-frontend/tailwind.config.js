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
          50: "#f9f9f9",
          100: "#f0f0f0",
          200: "#e4e4e4",
          300: "#d1d1d1",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#3d3d3d",
          800: "#2a2a2a",
          900: "#1a1a1a",
          950: "#111111",
        },
        brand: {
          50: "#f0f5ff",
          100: "#dde9ff",
          200: "#c0d5ff",
          300: "#93b5ff",
          400: "#6090ff",
          500: "#3b6ef5",
          600: "#2855e8",
          700: "#2044d0",
          800: "#1e3aa6",
          900: "#1e3683",
        },
      },
    },
  },
  plugins: [],
};
