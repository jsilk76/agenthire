/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#C8102E',
          gold: '#FDB913',
          dark: '#1a1a2e',
        }
      }
    },
  },
  plugins: [],
}
