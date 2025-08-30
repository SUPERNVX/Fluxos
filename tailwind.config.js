/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a1a1a',
        'dark-bg-secondary': '#2c2c2e',
        'light-bg': '#f5f5f7',
        'light-bg-secondary': '#ffffff',
        'accent': '#d946ef',
        'accent-hover': '#c026d3'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'],
      }
    },
  },
  plugins: [],
}