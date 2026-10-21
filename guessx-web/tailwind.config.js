/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'SF Pro Display', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'SF Pro Text', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        awash: {
          blue: {
            DEFAULT: '#002B5C',
            light: '#004080',
            dark: '#001F3F',
            foreground: '#ffffff',
            bg: '#002B5C',
            bgFrom: '#002B5C',
            bgTo: '#001F3F',
          },
          gold: {
            DEFAULT: '#C8A642',
            light: '#D4B85E',
            dark: '#A68832',
            bg: '#FFF8E7',
            foreground: '#002B5C',
          },
        },
        navy: {
          DEFAULT: '#002B5C',
          light: '#004080',
          dark: '#001F3F',
          foreground: '#ffffff',
          muted: '#e8e8ed',
        },
        neutral: {
          50: '#fafafc',
          100: '#f5f5f7',
          200: '#e8e8ed',
          300: '#d6d6d6',
          400: '#86868b',
          500: '#707070',
          600: '#515154',
          700: '#474747',
          800: '#2d2d2d',
          900: '#1d1d1f',
          950: '#000000',
        },
        primary: {
          DEFAULT: '#C8A642',
          foreground: '#002B5C',
        },
        secondary: {
          DEFAULT: '#f5f5f7',
          foreground: '#1d1d1f',
        },
        muted: {
          DEFAULT: '#f5f5f7',
          foreground: '#707070',
        },
        accent: {
          DEFAULT: '#fafafc',
          foreground: '#b64400',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1d1d1f',
        },
        border: '#d6d6d6',
        input: '#d6d6d6',
        ring: '#C8A642',
        background: '#ffffff',
        foreground: '#002B5C',
        destructive: {
          DEFAULT: '#ff3b30',
          foreground: '#ffffff',
        },
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        ink: '#002B5C',
        canvas: '#f5f5f7',
        'cool-wash': '#e8e8ed',
        'faded-surface': '#fafafc',
        'electric-blue': '#0071e3',
        'link-blue': '#0066cc',
        ember: '#b64400',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '28px',
        '3xl': '32px',
      },
      boxShadow: {
        'gold-glow': 'none',
        'gold-glow-lg': 'none',
        'blue-glow': 'none',
        'card-hover': 'none',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-down': 'slideDown 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-ring': 'pulse-ring 2s infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'confetti': 'confetti 0.8s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)' },
        },
        breathe: {
          '0%, 100%': { boxShadow: 'none' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}