# Retomar trabajo — APOPS Siempre

> Doc de handoff entre sesiones. Última actualización: 2026-05-10.
> Branch activa: `main`. Trabajo en producción en `https://apops.vercel.app`.

## Estado al cerrar la sesión

**Live en cloud**: https://apops.vercel.app — deploy automático desde `main` vía Vercel Pro.
**Repo**: https://github.com/saadypacheco/apops
**Supabase Cloud**: project `pozbdplbichrhojjeqiv` (apops-desa, plan free, region South America).
**Stack confirmado**: Next.js 14 App Router + Supabase (auth + RLS + Storage) + TypeScript + Tailwind. PWA mobile-first sobre container `max-w-[480px]` con decoración lateral discreta en desktop.

### Datos demo cargados (3 cuentas)

| Usuario | Email login | Password | Rol | Notas |
|---|---|---|---|---|
| **siempreapops** (Méndez, Carolina) | `siempreapops@apops.org.ar` | `siempreapops` | admin + role-switch | Es la cuenta de **demo al cliente**. Tiene flag `permite_role_switch=true` que activa un dropdown en el header para cambiar rol en vivo (admin / delegado / afiliado). Identifier de login: `siempreapops` (legajo). |
| **García, Lucía** | `delegado.norte@apops.org.ar` | `delegadonorte` | delegado | Norte. Representa a Pérez María y Rodríguez Ana. |
| **Sosa, Roberto** | `delegado.sur@apops.org.ar` | `delegadosur` | delegado | Sur. Representa a Martínez Pablo. |

> Importante: **no hay rastro del nombre real (Pacheco/Saady) en la demo cloud**. El admin se llama "Méndez, Carolina" con adherentes "Méndez, Daniel" (cónyuge) y "Méndez, Mateo" (hijo).

### Padrón demo

- 6 cotizantes en `padron_cotizantes`:
  - `30000001` Pérez, María (activa, APOPS, L-0001) — representada por García, Lucía
  - `20000001` Rodríguez, Ana (jubilada APOPS) — representada por García, Lucía
  - `30000003` Martínez, Pablo (NO afiliado APOPS, está en ATE) — representado por Sosa, Roberto
  - `99000001` Méndez, Carolina (admin demo, L-SIEMPREAPOPS) — representa a los 2 delegados
  - `99000002` García, Lucía (delegada norte, L-N0001) — representada por Méndez
  - `99000003` Sosa, Roberto (delegado sur, L-S0001) — representado por Méndez
- 6 adherentes en `padron_adherentes`:
  - 3 de Pérez María (Carlos cónyuge, Juan hijo, Laura hija)
  - 1 de Rodríguez Ana (Mario cónyuge)
  - 2 de Méndez Carolina (Daniel cónyuge, Mateo hijo)
- 10 noticias (algunas duplicadas del seed inicial — no molesta)
- 6 solicitudes de afiliación pendientes con firma SVG embebida (Fernández, Rojas, Pereyra × 2 cada uno)
- 2 mensajes de delegados a CD sobre el plenario

### Lo que funciona end-to-end (validable en `https://apops.vercel.app`)

- **Landing pública** con login compacto, carrusel autoplay con noticias destacadas (chevrons + CTA "Ver noticia"), decoración lateral desktop.
- **Auth v2** completo: login con clave + magic link + recovery + registro + bifurcación "no en padrón".
- **Credencial digital** con titular + adherentes (tabs), compartir por WhatsApp/email/link público sin destinatario fijo.
- **Vista pública** `/credencial-publica/[id]` (UUID como secret).
- **Feed** del afiliado: credencial al tope + widget de consultas WA/email/teléfono al gremio. Bottom nav: Inicio · Novedades · Mi perfil · Notificaciones.
- **/noticias** y **/noticias/[id]** públicas (para linkear desde landing).
- **/novedades** autenticada con AppShell.
- **Panel admin** (`/admin`): solicitudes pendientes (no-en-padrón) + solicitudes de afiliación online con detalle completo y firma + atajos a Gestionar novedades / Mensajes delegados / Notificaciones, todos con badges.
- **Gestión de novedades** (`/admin/novedades`): crear / editar / toggle publicada / toggle destacada / **eliminar** con confirmación.
- **Panel delegados** (`/delegados`): listado de cotizantes representados (cruce por `representante` en padrón) con stats por rol y badges por gremio. Form para mandar mensajes a CD (sistema viejo `mensajes_delegado`).
- **Mensajes de delegados** (`/admin/mensajes`): inbox para admins de los mensajes del delegado, con marcar leído + responder por mailto.
- **Notificaciones** (sistema nuevo `/notificaciones`):
  - Inbox con tabs Todas / Sin leer, listado de hilos con preview, indicador no-leído, flecha enviado/recibido, badge por rol.
  - Nueva notificación (`/notificaciones/nueva`) con buscador (nombre/DNI/legajo), chips de filtro según rol, selección múltiple, "Marcar todos los visibles", preview antes de enviar.
  - Vista de hilo (`/notificaciones/[hiloId]`) estilo chat con bubbles brand para los míos vs neutral para la contraparte. Form de respuesta con auto-reset y focus.
  - Reglas: admin ve a todos · delegado a sus cotizantes + admins · afiliado a SU delegado + admins.
- **Campana del header** activa con badge contador rojo (no-leídos).
- **FAB WhatsApp verde** en todas las pantallas autenticadas (saludo pre-cargado según rol, sin destinatario).
- **Role switcher** demo en el header (solo para `permite_role_switch=true`): dropdown 🛡️ Admin / 🤝 Delegado / 🧑 Afiliado.
- **Mi perfil** + cambio de clave (campo "actual" opcional para el caso "entré por magic link").
- **Página /software** demostrativa pública para presentar al cliente (con mocks visuales detallados de las 4 pantallas clave).

### Lo que NO está implementado todavía

- **Push notifications reales** (Web Push con VAPID). Hoy todo es in-app — para enterarse de algo el usuario tiene que abrir la app.
- **Tests** unitarios e integración. Lo que existe son tests viejos de auth v1 que probablemente están rotos.
- **PDF de afiliación + emails automáticos** al solicitante (features B y C del roadmap original).
- **Sistema viejo `mensajes_delegado` sigue coexistiendo** con el nuevo de notificaciones. Es deuda técnica — los dos hacen casi lo mismo.
- **AGENTS.md está desactualizado**: declara el "núcleo del producto" como *"sistema de consultas tipo ticket"*. Lo que construimos es distinto (credencial digital + comunicación bidireccional). Si el cliente lee AGENTS.md, hay tensión.

## Próxima sesión — Testing

**Objetivo declarado**: hacer tests de integración + tests unitarios + cualquier cierre que haga falta para considerar esta aplicación "terminada hasta acá".

### Sugerencia de orden

**1. Suite de tests unitarios** (vitest, ya configurado):
- Helpers puros: `parseIdentifier`, `firstName`, helpers de fecha, validaciones zod.
- Server actions con mocks de Supabase: `loginConClave`, `registrar`, `solicitarMagicLink`, `solicitarAcceso`, `cambiarClave`, `enviarNotificacion`, `responderHilo`, `aprobarAfiliacion`, etc.
- Componentes críticos con React Testing Library: `LoginForm`, `CredencialCarousel`, `NuevaNotificacionForm`.

**2. Tests de integración** (Playwright o equivalente):
- Flujo de registro nuevo afiliado (DNI en padrón).
- Flujo de login con clave + flujo de magic link.
- Flujo de afiliación online completo (wizard 3 pasos + firma).
- Flujo de enviar notificación admin → varios destinatarios + respuesta.
- Flujo de aprobación de afiliación desde admin.

**3. Tests de RLS** (críticos — ya hay un test viejo `tests/rls/afiliados-self-only.test.ts` que probablemente está roto):
- Verificar que un afiliado NO puede ver datos de otro afiliado.
- Verificar que un afiliado NO puede leer `padron_cotizantes` directamente (solo via server action).
- Verificar que las nuevas tablas (`hilos_notificacion`, `mensajes_notificacion`, `padron_adherentes`, `mensajes_delegado`) tienen RLS deny por default.

**4. Smoke test manual en producción** (`https://apops.vercel.app`):
- Login + registro + magic link
- Credencial + compartir
- Cambio de rol con switcher demo
- Notificaciones admin → delegado → afiliado
- Eliminar noticia
- WhatsApp FAB

**5. Cleanup pendiente** (si queda tiempo):
- Eliminar tests viejos de auth v1 que ya no aplican.
- Actualizar AGENTS.md con el estado real del producto (no "tickets" sino "credencial + comunicación").
- Resolver duplicados de noticias / solicitudes de afiliación en cloud (correr SQL de limpieza si molesta).

## Cómo arrancar la próxima sesión

```bash
# 1. Posicionarse
cd c:/repos/proyectosClaude/apops

# 2. Sincronizar
git pull origin main

# 3. Verificar Supabase local (probablemente esté corriendo)
"/c/Users/User/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/supabase/bin/supabase.exe" status

# 4. Tests del estado actual (probablemente algunos rotos)
npm run test

# 5. Levantar dev server
npm run dev
```

## URLs útiles

- **App live**: https://apops.vercel.app
- **App live (software)**: https://apops.vercel.app/software
- **App live (health check)**: https://apops.vercel.app/api/health
- **Vercel dashboard**: https://vercel.com/saadypacheco-4143s-projects/apops
- **Supabase dashboard**: https://supabase.com/dashboard/project/pozbdplbichrhojjeqiv
- **Repo**: https://github.com/saadypacheco/apops

## Decisiones técnicas tomadas en esta sesión

- **Hilos de notificaciones 1-a-1 paralelos** (no grupales). Cuando A manda a [B,C,D] se crean 3 hilos separados. Si B responde, su respuesta queda solo en el hilo A↔B.
- **Role switcher solo para cuentas con flag `permite_role_switch=true`**. Es feature de demo, no producción.
- **Keys legacy JWT** (`eyJ...`) en lugar de las nuevas `sb_publishable_*` / `sb_secret_*` porque el SDK no soporta las nuevas todavía. Lección documentada.
- **GRANTs explícitos** en migration 0025 porque Supabase Cloud con "Automatically expose new tables" desmarcado no aplica los GRANTs automáticos esperados por las migrations. Lección documentada.
- **Cambio de clave con `actual` opcional** para cubrir el caso "entré por magic link y no recuerdo la clave anterior".
- **Compartir credencial siempre sin destinatario** (afiliado elige contacto de su agenda), porque el padrón no tiene teléfonos/emails confiables de adherentes.

## Lecciones / anti-patterns capturados

- ⚠️ **"Automatically expose new tables" desmarcado** en Supabase Cloud → rompe los GRANTs por default. Resultado: PostgreSQL `42501 permission denied for table` en TODAS las queries, hasta service_role. Documentado en migration 0025 + en `presentacion-cliente.md`.
- 🐛 **`supabase gen types`** mete líneas espurias antes y después del bloque útil (warning del CLI + tag de plugin). Cleanup manual con `sed -n '/^export type Json/,/^} as const$/p'` hasta encontrar fix definitivo.
- 🔧 **Path dependence**: el path largo a `supabase.exe` (cacheado por npx) cambia entre versiones. Usar `npx supabase ...` es más portable y resuelve.
- 🔑 **`/api/health` endpoint** es oro puro para debug remoto post-deploy. Copiar este patrón a cualquier proyecto futuro con Next.js + Supabase.
- 🔑 **Logs estructurados con `[NOMBRE_FLUJO {traceId}]`** en server actions permiten correlacionar requests en Vercel Logs. Vale para cualquier server action crítica.

## PRs / commits

```
HEAD (a8ae7fd)  feat(notif): tanda 4 — campana activa, atajos, badges con contador
...
6963f31         feat(auth): Auth v2 — login con clave + magic link + registro + recuperación
e33cb9e         feat: afiliación online (wizard 3 pasos + firma) + UX landing
56ff17b         feat: landing con noticias + login + ruteo por rol
```

Ya está todo mergeado a `main`. PR #1 cerrado como MERGED el 2026-05-07.

## Para la próxima sesión — checklist de bienvenida

1. Leer **este archivo** (RESUME.md) y `presentacion-cliente.md` para contexto.
2. Verificar que `npm run test` corre (aunque muchos tests v1 estén rotos, ver qué pasa).
3. Decidir suite de testing: vitest only (unitarios + integración con supabase-js mockeado) o sumar Playwright.
4. Si el cliente ya hizo feedback de la demo, priorizar los ajustes pedidos antes de tests.
