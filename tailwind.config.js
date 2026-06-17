/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'hsl(40, 33%, 97%)',
        foreground: 'hsl(20, 14%, 12%)',
        primary: '#2E5C31',
        'primary-foreground': '#FFFFFF',
        'muted-foreground': '#6B7280',
        border: 'hsl(35, 20%, 87%)',
      },
    },
  },
  plugins: [],
};