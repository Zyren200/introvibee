/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--color-border)', /* sage-tinted */
        input: 'var(--color-input)', /* subtle-gray */
        ring: 'var(--color-ring)', /* sage-green */
        background: 'var(--color-background)', /* warm-off-white */
        foreground: 'var(--color-foreground)', /* forest-green */
        primary: {
          DEFAULT: 'var(--color-primary)', /* sage-green */
          foreground: 'var(--color-primary-foreground)', /* white */
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)', /* light-sage */
          foreground: 'var(--color-secondary-foreground)', /* forest-green */
        },
        accent: {
          DEFAULT: 'var(--color-accent)', /* terracotta */
          foreground: 'var(--color-accent-foreground)', /* forest-green */
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)', /* muted-rose */
          foreground: 'var(--color-destructive-foreground)', /* forest-green */
        },
        muted: {
          DEFAULT: 'var(--color-muted)', /* subtle-gray */
          foreground: 'var(--color-muted-foreground)', /* muted-green */
        },
        card: {
          DEFAULT: 'var(--color-card)', /* subtle-gray */
          foreground: 'var(--color-card-foreground)', /* forest-green */
        },
        popover: {
          DEFAULT: 'var(--color-popover)', /* subtle-gray */
          foreground: 'var(--color-popover-foreground)', /* forest-green */
        },
        success: {
          DEFAULT: 'var(--color-success)', /* affirmation-green */
          foreground: 'var(--color-success-foreground)', /* white */
        },
        warning: {
          DEFAULT: 'var(--color-warning)', /* soft-amber */
          foreground: 'var(--color-warning-foreground)', /* forest-green */
        },
        error: {
          DEFAULT: 'var(--color-error)', /* muted-rose */
          foreground: 'var(--color-error-foreground)', /* forest-green */
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        heading: ['Crimson Text', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
        caption: ['Karla', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      maxWidth: {
        'prose': '70ch',
      },
      transitionTimingFunction: {
        'gentle': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      transitionDuration: {
        'gentle': '250ms',
      },
      boxShadow: {
        'gentle-sm': '0 1px 3px rgba(45, 58, 46, 0.08)',
        'gentle': '0 3px 6px rgba(45, 58, 46, 0.1)',
        'gentle-md': '0 6px 12px rgba(45, 58, 46, 0.12)',
        'gentle-lg': '0 10px 25px -5px rgba(45, 58, 46, 0.15)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}