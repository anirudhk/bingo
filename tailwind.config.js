/** @type {import('tailwindcss').Config} */
export default {
  // Class strategy: <html class="dark"> activates dark variants. The store-driven
  // ThemeApplier toggles this so the user can override system preference.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      },
    },
  },
  plugins: [],
};
