/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Display', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Primary Blue
        blue: {
          900: '#082A5E',
          800: '#0A367B',
          700: '#0D469E',
          600: '#0044AE',
          500: '#115ACB',
          400: '#89B7FF',
          300: '#6196EA',
          200: '#92B7F0',
          100: '#B6CFF5',
          50:  '#E7EFFC',
        },
        // Grey / Neutral
        grey: {
          900: '#070A0E',
          800: '#151719',
          700: '#25272B',
          600: '#2C2F32',
          500: '#4A4C4F',
          400: '#5E6062',
          300: '#8F9193',
          200: '#C1C2C3',
          100: '#DADADB',
          50:  '#F0F0F1',
          25:  '#FAFAFA',
        },
        // Green / Success
        green: {
          900: '#084406',
          800: '#0A5908',
          700: '#0D720A',
          600: '#11930D',
          500: '#13A10E',
          400: '#42B43E',
          300: '#61C05E',
          200: '#92D490',
          100: '#B6E2B4',
          50:  '#E7F6E7',
        },
        // Red / Error
        red: {
          900: '#581618',
          800: '#731D1F',
          700: '#942528',
          600: '#BE2F33',
          500: '#D13438',
          400: '#DA5D60',
          300: '#E0777A',
          200: '#EAA2A3',
          100: '#F1C0C1',
          50:  '#FAEBEB',
        },
        // Yellow / Warning
        yellow: {
          900: '#854D00',
          800: '#B36800',
          700: '#DB8000',
          600: '#FA9200',
          500: '#FFAA33',
          400: '#FFC16B',
          300: '#FFD294',
          200: '#FFE3BD',
          100: '#FFF2E0',
          50:  '#FFF9F0',
        },
        // Violet / Accent
        violet: {
          900: '#380070',
          800: '#5700AD',
          700: '#6600CC',
          600: '#7000E0',
          500: '#7F00FF',
          400: '#B870FF',
          300: '#D1A3FF',
          200: '#E3C7FF',
          100: '#F2E5FF',
          50:  '#F7F0FF',
        },
      },
      borderRadius: {
        sm:  '4px',
        DEFAULT: '6px',
        md:  '8px',
        lg:  '12px',
        full: '9999px',
      },
      spacing: {
        // 4px grid
        1:  '4px',
        2:  '8px',
        3:  '12px',
        4:  '16px',
        6:  '24px',
        8:  '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        24: '96px',
        28: '112px',
      },
    },
  },
  plugins: [],
}
