import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#141414',
        'surface-2': '#1f1f1f',
        border: '#2a2a2a',
        'text-primary': '#f5f5f5',
        'text-muted': '#a3a3a3',
        accent: '#6366f1',
        danger: '#ef4444',
        success: '#22c55e',
      },
      borderColor: {
        DEFAULT: '#2a2a2a',
      },
    },
  },
  plugins: [],
}

export default config
