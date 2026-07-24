/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FDF8F3',
        'cream-dark': '#F5EDE4',
        brown: {
          50: '#FAF5F0',
          100: '#F0E6D8',
          200: '#E1D0B8',
          300: '#C9B08A',
          400: '#B08C5C',
          500: '#8B6914',
          600: '#6B5210',
          700: '#4A3A0C',
          800: '#2E2408',
          900: '#1A1505',
        },
        rust: '#B45309',
        sage: '#6B7F59',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        script: ['Brush Script MT', 'cursive'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(139, 105, 20, 0.1), 0 2px 4px -1px rgba(139, 105, 20, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(139, 105, 20, 0.1), 0 4px 6px -2px rgba(139, 105, 20, 0.05)',
      },
    },
  },
  plugins: [],
}
