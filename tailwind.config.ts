import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        brand: ['var(--font-bebas-neue)'],
      },
      colors: {
        'cine-dark': '#0a0a0a',
        'cine-red': '#ef4444',
      },
    },
  },
  plugins: [],
};

export default config;
