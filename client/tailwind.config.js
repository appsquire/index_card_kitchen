/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nana's kitchen — seafoam walls, enamel white, cherry pot red
        // (intentionally not cream + terracotta)
        cream: '#EEF5F2',
        'cream-dark': '#DCEAE4',
        wicker: {
          50: '#F7FBFA',
          100: '#E8F2EE',
          200: '#C5D9D0',
          300: '#9BBDB0',
          400: '#6F9A8C',
          500: '#557A6E',
          600: '#446358',
          700: '#374F46',
          800: '#2A3C36',
          900: '#1C2924',
        },
        gingham: {
          light: '#F9E6E6',
          DEFAULT: '#C23B3B',
          dark: '#8F2A2A',
        },
        herb: {
          light: '#E4F0E8',
          DEFAULT: '#4F7A5C',
          dark: '#355340',
        },
        butter: {
          light: '#FFF6D9',
          DEFAULT: '#F5D978',
          dark: '#D4B44A',
        },
        enamel: '#FFFEFA',
        appsquire: {
          orange: '#F9A825',
          'orange-dark': '#E8920F',
          'orange-light': '#FFC947',
          ink: '#2D3436',
          /* Muted butter — footer band on Index Card Kitchen */
          butter: '#F0E2B8',
          'butter-deep': '#E8D49A',
          'butter-muted': '#D4B44A',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        serif: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        hand: ['"Patrick Hand"', 'Kalam', 'cursive'],
        card: ['"Special Elite"', 'Courier New', 'monospace'],
      },
      boxShadow: {
        card: '2px 3px 0 rgba(28, 41, 36, 0.08), 0 8px 18px -10px rgba(28, 41, 36, 0.25)',
        'card-hover': '3px 5px 0 rgba(28, 41, 36, 0.1), 0 14px 28px -12px rgba(28, 41, 36, 0.3)',
        paper: '1px 1px 0 #d4cfc4, 3px 3px 0 rgba(28, 41, 36, 0.06)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-settle': {
          '0%': { transform: 'rotate(-1.2deg)' },
          '100%': { transform: 'rotate(-0.4deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        'soft-settle': 'soft-settle 0.6s ease-out both',
      },
    },
  },
  plugins: [],
}
