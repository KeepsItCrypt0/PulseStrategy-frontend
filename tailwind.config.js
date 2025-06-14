/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'custom-red': {
          600: '#8B0000', // Dark red from logo
          700: '#A52A2A', // Darker red for hover
        },
        'custom-blue': {
          600: '#191970', // Midnight blue from logo
          700: '#1E1A7B', // Darker blue for hover
        },
        'custom-purple': {
          600: '#4B0082', // Indigo from logo
          700: '#5D0E8B', // Darker purple for hover
        },
        'custom-gray': {
          400: '#D3D3D3', // Light gray for disabled
          500: '#A9A9A9', // Medium gray for disabled
          600: '#8A8A8A', // Dark gray for disabled
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
