/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0b0a12',
        'bg-surface': '#13111c',
        'bg-surface-hover': '#191626',
        'bg-elevated': '#1d192b',
        'border-subtle': 'rgba(255, 255, 255, 0.06)',
        'border-divider': 'rgba(255, 255, 255, 0.05)',
        'border-focus': 'rgba(124, 92, 255, 0.5)',
        'text-primary': '#f4f3f8',
        'text-secondary': '#9c96b0',
        'text-muted': '#655f7a',
        'accent-primary': '#7c5cff',
        'accent-hover': '#9075ff',
        'accent-soft': 'rgba(124, 92, 255, 0.15)',
        'emerald': '#10b981',
        'emerald-soft': 'rgba(16, 185, 129, 0.13)',
        'amber': '#f59e0b',
        'amber-soft': 'rgba(245, 158, 11, 0.14)',
        'rose': '#f43f5e',
        'rose-soft': 'rgba(244, 63, 94, 0.14)',
      },
      borderRadius: {
        'lg': '18px',
        'md': '12px',
        'sm': '8px',
        'pill': '999px',
      },
      boxShadow: {
        'card': '0 14px 34px -10px rgba(0, 0, 0, 0.55)',
        'popover': '0 22px 54px rgba(0, 0, 0, 0.75)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      height: {
        '64px': '64px',
      },
    },
  },
  plugins: [],
};
