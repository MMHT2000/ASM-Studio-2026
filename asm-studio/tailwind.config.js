/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      colors: {
        editor: {
          bg: '#1e1e2e',
          panel: '#181825',
          border: '#313244',
          accent: '#89b4fa',
          amber: '#f9e2af',
          green: '#a6e3a1',
          red: '#f38ba8',
          mauve: '#cba6f7',
          text: '#cdd6f4',
          subtext: '#a6adc8',
          surface: '#313244',
        },
      },
    },
  },
  plugins: [],
}

