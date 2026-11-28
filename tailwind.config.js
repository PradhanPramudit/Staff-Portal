/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px', letterSpacing: '-0.01em' }],
        sm: ['13px', { lineHeight: '20px', letterSpacing: '-0.01em' }],
        base: ['14px', { lineHeight: '20px', letterSpacing: '-0.011em' }],
        lg: ['16px', { lineHeight: '24px', letterSpacing: '-0.014em' }],
        xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.017em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.019em' }],
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
      },
      colors: {
        // Refined deep teal accent (kept from original, it's already sophisticated)
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.06), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        pop: '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
        'inner-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      borderColor: {
        DEFAULT: 'rgb(228 228 231 / 0.8)', // zinc-200/80 in light mode
      },
    },
  },
  plugins: [],
};
