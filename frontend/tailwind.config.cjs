/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        accent: '#22c55e',
        background: '#020617',
        surface: '#020617',
        card: '#020617',
      },
    },
  },
  plugins: [],
};

