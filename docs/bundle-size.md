# Bundle size — feature 001-afiliado-auth

**Fecha**: 2026-05-03
**Build**: producción (`npm run build`)
**Next.js**: 14.2.35
**Constitución VII**: mobile-first → JS al cliente debe mantenerse mínimo.

## Cómo reproducir

```bash
# Build de producción
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder \
npm run build

# Reporte visual interactivo (abre el navegador)
ANALYZE=true npm run build
# o equivalente
npm run analyze
```

## Snapshot del 2026-05-03

| Ruta | Tipo | Size | First Load JS |
|---|---|---|---|
| `/` | static | 150 B | 87.4 kB |
| `/login` | static | 2.87 kB | 98.8 kB |
| `/login-sin-legajo` | static | 2.83 kB | 98.8 kB |
| `/email` | dynamic | 2.82 kB | 90.1 kB |
| `/nombre-completo` | dynamic | 2.83 kB | 90.1 kB |
| `/magic-link-enviado` | static | 150 B | 87.4 kB |
| `/magic-link-expirado` | dynamic | 177 B | 96.1 kB |
| `/pendiente-validacion` | static | 177 B | 96.1 kB |
| `/perfil` | dynamic | 1.98 kB | 89.2 kB |
| `/feed` | dynamic | 150 B | 87.4 kB |
| `/auth/callback` (route handler) | dynamic | 0 B | 0 B |

**Compartido por todas las rutas**: 87.3 kB (chunks de framework + Tailwind base).
**Middleware**: 80.9 kB.

## Lectura

- **Total First Load JS rondando 87-99 kB**. Por debajo del benchmark
  común de Next.js (~120 kB de baseline para apps típicas con framework
  + algún UI lib pesado).
- Las rutas con form (login, login-sin-legajo, email, nombre-completo)
  agregan ~3 kB cada una — el costo del Client Component (form +
  useFormState).
- `/magic-link-enviado` y `/feed` no agregan JS propio (solo el shared) —
  son Server Components puros.
- **Middleware 80.9 kB** es el supabase/ssr para refrescar la sesión —
  costo aceptable para auth gate.
- No hay outliers ni código muerto detectable en este snapshot.

## Tendencias a vigilar (próximas features)

- Si el First Load JS sube de **~100 kB** en cualquier ruta, revisar qué
  Client Component se agregó.
- El middleware tiene un techo razonable de ~120 kB; si crece más, mover
  lógica a Edge Functions.
- Para feature de prensa/feed (Phase 1 plan), monitorear que `/feed` no
  arrastre librerías de imagen pesadas.

## Reporte visual

`@next/bundle-analyzer` está wireado (`npm run analyze`). El reporte
HTML interactivo aparece automáticamente al terminar el build. No se
guarda en repo (output de build) — se regenera on-demand.
