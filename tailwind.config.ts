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
        // Paleta APOPS — basada en apops.org.ar (navy + cyan + azul medio)
        brand: {
          sky: '#5BB5E0',      // cyan claro del logo APOPS (top del gradient)
          azure: '#3B8AD9',    // azul medio
          blue: '#1E5BA8',     // azul de botones/accents
          deep: '#143963',     // azul profundo
          navy: '#0F2A47',     // navy del header oficial (bottom del gradient)
          ink: '#042C53',      // textos principales sobre fondos claros
          muted: '#5F5E5A',    // textos secundarios
          // alias para compatibilidad con código que escribió la versión verde
          teal: '#1E5BA8',     // → blue
          lime: '#5BB5E0',     // → sky
          green: '#3B8AD9',    // → azure
        },
      },
      backgroundImage: {
        // Gradient top → bottom: navy oscuro → azul medio. Predominantemente
        // oscuro arriba (logo y noticias se leen blanco con alta contraste),
        // se aclara hacia el bottom donde está el form (sigue siendo azul
        // medio, AA para blanco bold).
        'brand-gradient':
          'linear-gradient(180deg, #0A1F38 0%, #0F2A47 25%, #143963 55%, #1E5BA8 100%)',
        'brand-gradient-soft':
          'linear-gradient(180deg, #DCEEFB 0%, #B5DBF3 100%)',
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
