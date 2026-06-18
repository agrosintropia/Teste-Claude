/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cacau: {
          50:  '#fdf6f0',
          100: '#f9e8d8',
          200: '#f0c9a0',
          500: '#8B4513',
          700: '#5C3317',
          900: '#3B1F0A',
        },
      },
    },
  },
  plugins: [],
}
