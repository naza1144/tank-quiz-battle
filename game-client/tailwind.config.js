/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        retro: ['"Press Start 2P"', 'monospace', 'sans-serif'],
        pixel: ['"Silkscreen"', 'monospace', 'sans-serif'],
        thai: ['"Prompt"', 'sans-serif']
      },
      colors: {
        retro: {
          dark: '#0f172a',
          brick: '#b91c1c',
          steel: '#cbd5e1',
          bush: '#15803d',
          water: '#0284c7',
          gold: '#eab308'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounce 0.5s infinite'
      }
    },
  },
  plugins: [],
}
