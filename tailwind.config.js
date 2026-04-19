/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palet warna dari Anda
        brand: {
          darkest: '#8C1F1F',  // Merah Gelap (Text Header / Sidebar aktif)
          dark: '#BF1111',     // Merah Tua (Button Hover)
          primary: '#D92929',  // Merah Utama (Button / Icon / Highlight)
          light: '#F24949',    // Merah Terang (Chart / Badge)
          accent: '#F29B9B',   // Merah Muda (Background soft / Chart background)
          bg: '#FFF5F5',       // Background halaman (sangat muda, custom)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Pastikan terlihat modern
      }
    },
  },
  plugins: [],
}