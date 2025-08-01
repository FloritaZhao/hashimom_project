/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f46e5', // indigo for a soft feel
          light: '#818cf8',
          dark: '#3730a3',
        },
      },
    },
  },
  plugins: [],
};