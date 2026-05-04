import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Escala explícita per AGENTS.md §4 (mobile-first, legible para personas mayores)
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.375rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.75rem', { lineHeight: '2rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      colors: {
        // Paleta APOPS — verde sindical (gradient lime → teal)
        brand: {
          lime: '#7BC142',     // top del gradient
          green: '#3FB077',
          teal: '#2E9F8C',     // medio
          deep: '#1A6F6A',     // bottom (texto blanco con buen contraste encima)
          ink: '#042C53',      // textos principales sobre fondos claros
          muted: '#5F5E5A',    // textos secundarios
        },
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(180deg, #7BC142 0%, #3FB077 35%, #2E9F8C 75%, #1A6F6A 100%)',
        'brand-gradient-soft':
          'linear-gradient(180deg, #E8F5DC 0%, #C9E8D8 100%)',
      },
      minHeight: {
        // Touch targets WCAG ≥ 44px (constitución II)
        touch: '2.75rem',
      },
      minWidth: {
        touch: '2.75rem',
      },
      boxShadow: {
        card: '0 4px 16px -4px rgba(4, 44, 83, 0.12)',
        cardHover: '0 8px 24px -6px rgba(4, 44, 83, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
