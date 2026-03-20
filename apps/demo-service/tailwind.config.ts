import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#fff7ed',
        tide: '#1f3b4d',
        peach: '#f58f7c',
        mint: '#8fc0a9',
      },
    },
  },
  plugins: [],
};

export default config;
