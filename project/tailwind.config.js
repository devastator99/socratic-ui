/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}', './index.js', './index.tsx'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'system-ui', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: 'inherit',
              textDecoration: 'underline',
              '&:hover': {
                color: 'inherit',
              },
            },
            h1: {
              color: 'inherit',
            },
            h2: {
              color: 'inherit',
            },
            h3: {
              color: 'inherit',
            },
            h4: {
              color: 'inherit',
            },
            strong: {
              color: 'inherit',
            },
            code: {
              color: 'inherit',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            pre: {
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              color: 'inherit',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
            },
          },
        },
      },
    },
  },
  plugins: [],
};