/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
            colors: {
        base: {
          900: '#0A0A0C', // Deep graphite base
          800: '#141416', // Primary surface
          700: '#1E1E20', // Secondary surface
          600: '#2A2A2D', // Borders
          500: '#3F3F42',
        },
        ink: {
          50: '#F5F5F3',  // Warm white (Primary text)
          100: '#E6E6E4', 
          200: '#C7C7C5',
          300: '#A3A3A0', // Muted stone (Secondary text)
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#262626',
          800: '#171717',
          900: '#0A0A0A',
        },
        vermilion: {
          50: '#FFF5F3',
          100: '#FFE7E1',
          200: '#FFD1C6',
          300: '#FFB19E',
          400: '#FF876C',
          500: '#FA5A37', // TRACE accent
          600: '#E83E1A',
          700: '#C32F10',
          800: '#A12911',
          900: '#852714',
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

