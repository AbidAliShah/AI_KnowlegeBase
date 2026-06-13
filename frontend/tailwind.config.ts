import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      keyframes: {
        loading: {
          '0%': { opacity: '.2' },
          '20%': { opacity: '1' },
          '100%': { opacity: '.2' },
        },
      },
      animation: {
        loading: 'loading 1s ease-in-out infinite',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        mustard: {
          DEFAULT: '#C9A227',
          50: '#FBF6E6',
          100: '#F4E8B8',
          200: '#EBD581',
          300: '#E1C24A',
          400: '#D4B135',
          500: '#C9A227',
          600: '#A4831F',
          700: '#7E6517',
          800: '#594710',
          900: '#332908',
        },
        charcoal: {
          DEFAULT: '#2C2C2C',
          50: '#F4F4F4',
          100: '#E5E5E5',
          200: '#C9C9C9',
          300: '#A8A8A8',
          400: '#7A7A7A',
          500: '#525252',
          600: '#3D3D3D',
          700: '#2C2C2C',
          800: '#1F1F1F',
          900: '#111111',
        },
        offwhite: {
          DEFAULT: '#E8E6E1',
          50: '#FAF9F7',
          100: '#F2F1ED',
          200: '#E8E6E1',
          300: '#D9D6CF',
          400: '#C2BEB4',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;

export default config;
