/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--accent))',
        secondary: 'hsl(var(--accent-secondary))',
        background: 'hsl(var(--bg-primary))',
        surface: 'hsl(var(--surface))',
        'text-primary': 'hsl(var(--text-primary))',
        'text-secondary': 'hsl(var(--text-secondary))',
        border: 'hsl(var(--border))',
        'border-light': 'hsl(var(--border-light))',
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
          'bg-light': 'var(--glass-bg-light)',
          'border-light': 'var(--glass-border-light)',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        error: 'hsl(var(--error))',
      },
      backgroundColor: {
        primary: 'hsl(var(--bg-primary))',
        secondary: 'hsl(var(--bg-secondary))',
        tertiary: 'hsl(var(--bg-tertiary))',
        surface: 'hsl(var(--surface))',
      },
      textColor: {
        primary: 'hsl(var(--text-primary))',
        secondary: 'hsl(var(--text-secondary))',
      },
      borderColor: {
        DEFAULT: 'hsl(var(--border))',
        light: 'hsl(var(--border-light))',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4)',
        glow: '0 0 20px hsl(var(--accent) / 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'spring-in': 'springIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        springIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(10px)' },
          '60%': { transform: 'scale(1.02) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--accent) / 0.4)' },
          '50%': { boxShadow: '0 0 20px 5px hsl(var(--accent) / 0.2)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};