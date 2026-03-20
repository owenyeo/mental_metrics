import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14213d',
        mist: '#eef3f6',
        coral: '#ff7f50',
        sage: '#7aa095',
        sun: '#f3c969',
      },
    },
  },
  plugins: [],
};

export default config;
