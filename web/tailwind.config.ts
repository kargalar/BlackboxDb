import type { Config } from 'tailwindcss';
import scrollbarHide from 'tailwind-scrollbar-hide';
import colors from 'tailwindcss/colors';

const surfaceColors = {
  page: 'rgb(var(--surface-page-rgb) / <alpha-value>)',
  panel: 'rgb(var(--surface-panel-rgb) / <alpha-value>)',
  raised: 'rgb(var(--surface-raised-rgb) / <alpha-value>)',
  hover: 'rgb(var(--surface-hover-rgb) / <alpha-value>)',
};

// Keep legacy dark utilities consistent with the shared surface palette.
const neutralColors = {
  ...colors.neutral,
  800: surfaceColors.raised,
  900: surfaceColors.panel,
  950: surfaceColors.page,
};

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderWidth: { DEFAULT: '0px' },
      borderRadius: {
        lg: '0.75rem',
        xl: '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-6px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        shake: 'shake 0.6s ease-in-out',
      },
      colors: {
        surface: surfaceColors,
        neutral: neutralColors,
        gray: neutralColors,
        slate: neutralColors,
        zinc: neutralColors,
        indigo: neutralColors,
        sky: neutralColors,
        cyan: neutralColors,
        pink: neutralColors,
        purple: {
          ...neutralColors,
          300: 'rgb(var(--theme-primary-300) / <alpha-value>)',
          400: 'rgb(var(--theme-primary-400) / <alpha-value>)',
          500: 'rgb(var(--theme-primary-500) / <alpha-value>)',
          600: 'rgb(var(--theme-primary-600) / <alpha-value>)',
        },
        violet: {
          ...neutralColors,
          100: 'rgb(var(--theme-primary-300) / 0.2)',
          200: 'rgb(var(--theme-primary-300) / 0.4)',
          300: 'rgb(var(--theme-primary-300) / <alpha-value>)',
          400: 'rgb(var(--theme-primary-400) / <alpha-value>)',
          500: 'rgb(var(--theme-primary-500) / <alpha-value>)',
          600: 'rgb(var(--theme-primary-600) / <alpha-value>)',
          700: 'rgb(var(--theme-primary-600) / <alpha-value>)',
        },
        fuchsia: {
          ...neutralColors,
          300: 'rgb(var(--theme-primary-300) / <alpha-value>)',
          400: 'rgb(var(--theme-primary-400) / <alpha-value>)',
          500: 'rgb(var(--theme-primary-500) / <alpha-value>)',
          600: 'rgb(var(--theme-primary-600) / <alpha-value>)',
        },
        blue: {
          ...neutralColors,
          300: 'rgb(var(--theme-secondary-300) / <alpha-value>)',
          400: 'rgb(var(--theme-secondary-400) / <alpha-value>)',
          500: 'rgb(var(--theme-secondary-500) / <alpha-value>)',
          600: 'rgb(var(--theme-secondary-600) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [scrollbarHide],
};

export default config;
