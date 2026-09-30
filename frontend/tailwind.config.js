/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        parchment: {
          50: '#fbf9f4',
          100: '#f7f3ea',
          200: '#efe9d8',
          300: '#e3dcc8',
          400: '#d4cab0',
          500: '#c2b596',
        },
        ink: {
          50: '#f6f5f3',
          100: '#e8e6e1',
          200: '#cfccc4',
          300: '#a8a49a',
          400: '#7c776c',
          500: '#5a564d',
          600: '#3e3b34',
          700: '#2b2924',
          800: '#1c1b18',
          900: '#131210',
        },
        vermilion: {
          50: '#fcf4f0',
          100: '#f9e3d8',
          200: '#f0c4ac',
          300: '#e29d7c',
          400: '#d17550',
          500: '#b85a38',
          600: '#9c4828',
          700: '#7d3a20',
          800: '#5e2c18',
          900: '#3f1d10',
        },
        brass: {
          50: '#faf7ee',
          100: '#f2ead0',
          200: '#e3d2a0',
          300: '#cdb574',
          400: '#b39850',
          500: '#967d3c',
          600: '#7a6330',
          700: '#5e4c25',
          800: '#42351a',
          900: '#2a1f10',
        },
        slate: {
          50: '#f4f4f2',
          100: '#e8e8e4',
          200: '#d1d1cb',
          300: '#b0b0a8',
          400: '#888880',
          500: '#6a6a62',
          600: '#52524b',
          700: '#3f3f39',
          800: '#2e2e29',
          900: '#1f1f1c',
        },
      },
      fontSize: {
        'display': ['clamp(3.5rem, 7vw, 6rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
        'hero': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'section': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      maxWidth: {
        'prose-doc': '52rem',
        'canvas': '72rem',
      },
      boxShadow: {
        'panel': '0 1px 3px rgba(28,27,24,0.04), 0 8px 24px rgba(28,27,24,0.06)',
        'drawer': '0 -2px 40px rgba(28,27,24,0.08), 0 0 1px rgba(28,27,24,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'resolve': 'resolve 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        resolve: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
