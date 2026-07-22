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
        earth: {
          50: '#fbfbfa',   // Warm off-white
          100: '#f7f5f0',  // Sand/cream
          200: '#e8e5dd',  // Warm border grey
          300: '#c5bdae',  // Muted light brown
          400: '#a39782',
          500: '#7c776e',  // Muted text grey/brown
          600: '#5c4e3b',  // Warm soil brown
          700: '#453a2b',
          800: '#2e261d',
          900: '#1b271d',  // Charcoal green/black
        },
        forest: {
          50: '#f1f5f2',
          100: '#dbe6de',
          200: '#b8ccbf',
          300: '#8fae99',
          400: '#648f71',
          500: '#2e7d32',  // Primary Forest Green
          600: '#276a2b',
          700: '#1e4620',  // Dark Forest Green
          800: '#142b1a',  // Dark Card Background
          900: '#0d1f11',  // Dark App Background
        },
        terracotta: {
          50: '#fdf5f2',
          100: '#fbe7e1',
          200: '#f5c3b5',
          300: '#ec9883',
          400: '#df694f',
          500: '#a0522d',  // Earthy terracotta
          600: '#8d6e63',  // Earthy wood brown
          700: '#701e0f',
          800: '#481208',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
