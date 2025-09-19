/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Include all files in src folder
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        roboto: ["Roboto", "sans-serif"], // Add custom font family
      },
      colors: {
        brand: {
          navy: '#0a1020',
          navy2: '#0b142c',
          navy3: '#0a1327',
          blue: '#2563eb',
          indigo: '#4f46e5',
        }
      }
    },
  },
  plugins: [],
}
