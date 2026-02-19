import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#eef2f7',
          200: '#d9e2ec',
          300: '#bcccdc',
          400: '#9aa9bc',
          500: '#6b7a90',
          600: '#4f5f74',
          700: '#3b4859',
          800: '#263243',
          900: '#131a26',
        },
        blue: {
          50: '#eef5ff',
          100: '#dceafe',
          200: '#bedafe',
          300: '#91c1fc',
          400: '#5da1f7',
          500: '#3f83f0',
          600: '#2e69de',
          700: '#2654c7',
          800: '#2546a1',
          900: '#243d80',
        },
        emerald: {
          50: '#eefcf6',
          100: '#d2f7e7',
          200: '#a8ecd1',
          300: '#6fddb5',
          400: '#3cc69a',
          500: '#21a981',
          600: '#168a6a',
          700: '#136f57',
        },
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          400: '#fb7185',
          500: '#f43f5e',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          600: '#d97706',
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
    },
  },
} satisfies Config
