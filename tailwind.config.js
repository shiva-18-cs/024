/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light enterprise neutrals
        coal: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#080d1a',
        },
        // Brand: institutional deep blue
        cil: {
          blue: '#1d4ed8',
          light: '#3b82f6',
          dark: '#1e3a8a',
          gold: '#b45309',
          teal: '#0f766e',
        },
        // UI surface colors for light theme
        surface: {
          DEFAULT: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e8edf5',
          300: '#dde3ed',
        },
        // Status semantic colors
        status: {
          green: '#15803d',
          amber: '#b45309',
          red: '#b91c1c',
          blue: '#1d4ed8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        sidebar: '1px 0 0 0 #e2e8f0',
        header: '0 1px 0 0 #e2e8f0',
      },
    },
  },
  plugins: [],
}
