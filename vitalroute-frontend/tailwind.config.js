/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
      },
      colors: {
        obsidian: '#0b0c10',
        charcoal: '#1f2833',
        slate: '#c5c6c7',
        neonblue: '#45a29e',
        iceblue: '#66fcf1',
        dullcrimson: '#8b0000',
        amber: '#ffbf00',
      }
    },
  },
  plugins: [],
}
