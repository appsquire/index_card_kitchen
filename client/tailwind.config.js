/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Wicker/Picnic basket theme
        cream: '#FEF9F3',
        'cream-dark': '#F7EDE2',
        wicker: {
          50: '#FDF8F0',
          100: '#F9EDDB',
          200: '#F0D9B5',
          300: '#E4C088',
          400: '#D4A55A',
          500: '#C08B3F',
          600: '#A67032',
          700: '#845626',
          800: '#6B451F',
          900: '#4A3118',
        },
        // Classic red gingham accent
        gingham: {
          light: '#F5E1E1',
          DEFAULT: '#C94C4C',
          dark: '#9A3535',
        },
        // Natural greens for fresh accents
        herb: {
          light: '#E8F0E4',
          DEFAULT: '#5B7F52',
          dark: '#3D5436',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        hand: ['Caveat', 'cursive'],
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(74, 49, 24, 0.15), 0 1px 3px -1px rgba(74, 49, 24, 0.1)',
        'card-hover': '0 8px 20px -4px rgba(74, 49, 24, 0.15), 0 4px 8px -2px rgba(74, 49, 24, 0.08)',
      },
      backgroundImage: {
        'gingham-pattern': `
          linear-gradient(45deg, #F5E1E1 25%, transparent 25%),
          linear-gradient(-45deg, #F5E1E1 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #F5E1E1 75%),
          linear-gradient(-45deg, transparent 75%, #F5E1E1 75%)
        `,
      },
    },
  },
  plugins: [],
}
