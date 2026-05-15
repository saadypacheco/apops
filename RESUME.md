# Retomar trabajo — APOPS Siempre

> Doc de handoff entre sesiones. Última actualización: 2026-05-15 (sesión tarde).
> Branch activa: `main`. Trabajo en producción en `https://apops.vercel.app`.

## Estado al cerrar la sesión

**Live en cloud**: https://apops.vercel.app — deploy automático desde `main` vía Vercel Pro.
**Repo**: https://github.com/saadypacheco/apops
**Supabase Cloud**: project `pozbdplbichrhojjeqiv` (apops-desa, plan free, region South America).
**Stack**: Next.js 14 App Router + Supabase + TypeScript + Tailwind + PWA. Mobile-first con AppShell `max-w-md` por default; el dashboard CD usa `wide=true` para `max-w-7xl` en desktop con sidebar colapsable.

### Cuentas demo (sin cambios desde 2026-05-10)

| Usuario | Email login | Password | Rol | Notas |
|---|---|---|---|---|
| **siempreapops** (Méndez, Carolina) | `siempreapops@apops.org.ar` | `siempreapops` | admin + role-switch | Cuenta de demo. Tiene flag `permite_role_switch=true` que activa dropdown en el header para cambiar rol en vivo (admin / delegado / afiliado). |
| **García, Lucía** | `delegado.norte@apops.org.ar` | `delegadonorte` | delegado | Norte. Representa a Pérez María y Rodríguez Ana. |
| **Sosa, Roberto** | `delegado.sur@apops.org.ar` | `delegadosur` | delegado | Sur. Representa a Martínez Pablo. |

### Estado de la base de datos en cloud

- **Padrón ANSES real cargado**: `ministerio.xlsx` (`data/` gitignored), JULIO 2016 + sintéticos derivados ABRIL/MAYO/JUNIO 2016 → 4 snapshots con ~15k cotizantes cada uno (variaciones controladas en altas/bajas/categorías/gremios).
- **Adherentes**: 18 filas (4 originales del seed migration 0023 + 14 sintéticos del script `seed-demo-adherentes`).
- **Tabla `push_subscriptions`** creada en migration 0031, vacía hasta que algún usuario active push desde `/perfil`.
- 6 afiliados demo con `padron_id = NULL` (no matchearon contra el padrón real porque sus DNIs son sintéticos; se loguean OK).

## Lo construido en esta sesión (2026-05-14 → 2026-05-15)

Aproximadamente 35 commits productivos. Resumen por área:

### A — Padrón ANSES (carga + histórico)
- Migration 0028: `padron_snapshots` + vista `padron_cotizantes_actual` + `afiliados.fecha_baja`.
- Migration 0029: legajo primary, DNI nullable (~0.12% del Excel real viene sin DNI).
- Migration 0030: dropea snapshot CARGA INICIAL del seed (era 2026-05 y bloqueaba la vista actual).
- Parser xlsx puro (`src/lib/admin/padron-parser.ts`) probado contra archivo real (15558 filas / 0 errores).
- Server action `subirPadron` con dedup, needsConfirmation, force-replace, batches de 500, re-link afiliados, auto-baja por desaparición, audit log.
- UI `/admin/padron`: upload + listado snapshots + stats.
- Script `seed-demo-snapshots.ts` (corre con `.env.cloud`).

### B — Dashboard Comisión Directiva (`/admin/dashboard`)
Tabs server-side via `?tab=`: Resumen / Padrón / Evolución / Eventos / Delegados / App / Altas-Bajas.

**Resumen**: 4 KPI cards (Cotizantes, APOPS, Delegados, Adopción) con ícono circular + delta vs mes anterior + badge "Objetivo X ✓/!". Detalle del padrón. Cambios mes vs mes condensado. Resumen CD. Feed de últimas novedades publicadas.

**Padrón**: Mapa SVG Argentina con choropleth + números encima de provincias + total prominente + CABA como marker. Distribución por edificio top 10 / provincia top 8 / planta / sexo / edad / categorías (barras CSS). Donut chart de gremios. Heatmap edificios × dimensiones (top 15, color verde/amber/rojo por columna).

**Evolución**: Line chart por gremio (4 períodos). Line chart de cotizantes totales. Bar chart de altas/bajas por mes con tabla detallada APOPS expandible.

**Eventos del mes**: cumpleaños + aniversarios APOPS del mes calendar actual, con plantillas WhatsApp.

**Delegados**: stats CD + mandatos por vencer expandible + edificios sin delegado.

**App**: registrados / activos / % adopción / engagement con objetivos.

**Altas/Bajas**: listas accionables con WhatsApp/email + filtros por gremio (chips).

**Cross-tab**: sidebar lateral colapsable en desktop (state en localStorage), tabs horizontales en mobile, selector de período en header, footer con timestamp de última carga.

**Fix bug PostgREST cap-1000**: paginación en chunks. Sin esto el dashboard mostraba "1000 afiliados" en vez de 4631.

### C — Dashboard del delegado (`/delegados`)
- Alerta amber si su mandato vence en 30 días.
- Bloque "Eventos APOPS del mes en tu sector" (cumpleaños/aniversarios filtrados a sus representados).
- Bloque "Altas y bajas en tu edificio" (todos los gremios, no solo APOPS).

### D — Listado de cotizantes para admin (`/admin/cotizantes`)
Búsqueda por nombre / legajo / DNI exacto, filtros gremio + planta, paginación 50 por página.

### E — Sistema de notificaciones
- Notif **automática in-app a delegados** cuando se sube nuevo padrón, listando altas/bajas por edificio con **nombre + gremio** de cada persona.
- **Fix duplicados**: idempotencia por (autor, dest, asunto) en últimas 24h + skip si es reemplazo (`force=true`).
- **Plantillas rápidas** para admin en `/notificaciones/nueva`: 🥽 Anteojos / 🌴 Vacaciones / 📋 Trámite / 📅 Plenario.
- **Búsqueda en inbox** (`/notificaciones`): por nombre, asunto, DNI o legajo de la contraparte. Cards muestran DNI/legajo.
- **Web Push real con VAPID** (infra completa, pendiente env vars):
  - Migration 0031 `push_subscriptions`.
  - `web-push` instalado.
  - `src/lib/push/send.ts` con `sendPushToAfiliado()` que limpia 404/410.
  - Server actions `subscribePush()` / `unsubscribePush()`.
  - Service worker actualizado con handlers `push` y `notificationclick`.
  - Componente `<EnablePushButton>` con estados (loading/unsupported/no_vapid/denied/default/enabled) sumado a `/perfil`.
  - Hooks en `enviarNotificacion` y `notifyDelegatesAboutMovements` que disparan push a destinatarios.
  - **Fail gracefully**: si faltan las VAPID env vars, devuelve `{ skipped: 'no_vapid_config' }` sin romper la app.

### F — PWA instalable
- 3 iconos generados (192, 512, maskable 512) con sharp.
- Service worker mínimo + handlers push.
- `manifest.json` completo con icons + screenshots (mobile 540×1170 + desktop 1280×720 para Richer Install UI) + id.
- Componente `<InstallPWAButton>` reusable con 4 variants + modal de instrucciones por plataforma (iOS / Android / Desktop / Genérico).
- Sumado a: landing principal, página `/software` (hero + nav + sección dedicada + CTA + FAQ).

### G — Adherentes (familiares)
- Migration 0023 ya existente (no se tocó).
- Script `seed-demo-adherentes.ts` con ~14 familiares sintéticos atados a los 6 demos.
- Parser xlsx (`adherentes-parser.ts`) headers flexibles, validaciones, vínculos normalizados.
- Server action `subirAdherentes` con modo reemplazo (default) / agregar.
- UI `/admin/adherentes` con form + modo + stats.

### H — Otros
- Landing compactada (sin dots del carousel, sin hero "Hola Bienvenido", paddings reducidos para que entre en viewport).
- Migration 0029 (legajo primary) consolidada con Excel real.
- Fix lint que estaba bloqueando deploys de Vercel.

### I — Refactor de afiliación + envío por mail (sesión tarde 2026-05-15)

Tres commits productivos sobre el flujo `/afiliarse`:

**`16d3508` — Wizard 3 pasos + FAB contacto**
- Migration 0032: afloja NOT NULL en `telefono`, `fecha_nacimiento`, `tipo_planta` (pasan a opcionales en DB).
- Reduce required del form a 5 campos: legajo, apellido y nombre, DNI, celular, email. Quita `telefono` del UI (queda solo celular).
- Wizard refactorizado: paso 1 obligatorios; paso 2 todo opcional con `<details>` y banner; paso 3 resumen + firma + enviar.
- Auto-salto al primer paso con error cuando el server devuelve `fieldErrors` (arregla bug "Revisá los campos marcados" sin pista visual).
- Legajo numérico: placeholder `983928`, regex `^[0-9]{4,10}$`.
- FAB contacto: para afiliado abre menú expandible WhatsApp/Email/Llamar a APOPS; admin/delegado mantienen FAB ad-hoc actual.
- Quita `ConsultasWidget` del home (duplicado con FAB).

**`8d558fe` — Envío de PDF firmado por mail**
- Migration 0033: columnas tracking en `solicitudes_afiliacion` (`email_aspirante_enviado_at`, `email_apops_enviado_at`, `email_delegado_enviado_at`, `email_delegado_destinos`, `email_error`).
- `src/lib/email/send.ts`: wrapper de Resend (REST API directo). Fail gracefully si `RESEND_API_KEY` o `EMAIL_FROM` no están — return `{ ok: false, skipped: true }` y la solicitud igual queda en DB.
- `src/lib/afiliacion/pdf.ts`: genera PDF con `pdf-lib` — header, datos agrupados por sección, autorización del 3%, firma embedida desde base64 del SignaturePad.
- `src/lib/afiliacion/delegados-lookup.ts`: cruza `padron.representante` (filtrado por edificio) con `afiliados.rol='delegado'` para encontrar emails de delegados a notificar.
- Endpoint `GET /api/edificios`: lista única de `lugar_trabajo_padron` del snapshot actual, `revalidate: 3600`. Alimenta el combo del form.
- Server action `submitAfiliacion`: post-insert ejecuta `dispatchAfiliacionEmails()` que dispara 3 mails en paralelo (aspirante + apops + delegado(s)) y actualiza columnas de tracking.
- `/afiliarse/exito` ahora consulta la fila por id y muestra explícitamente a quién se mandó copia (con ícono por canal) o banner amber si fallaron todos los envíos.

**`0d63107` — FAB instalar + landing compacta + edificio obligatorio**
- `InstallPWAButton`: 2 variants nuevos `fab` (bottom-20) y `fab-stacked` (bottom-36) para apilarse encima del FAB de contacto. Auto-oculto si la PWA ya está instalada.
- Sacado el botón inline de "Instalar app" de landing (duplicado con el FAB). FAB también sumado a `/software` y al `AppShell` (todas las páginas autenticadas).
- LoginForm: gap entre "¿Olvidaste tu clave?" y "¿Primera vez? Registrate" reducido de `1.5` a `0` (más pegados).
- NoticiasCarousel: quitado el título "Últimas novedades"; queda solo "Ver todas →" a la derecha. Compactados paddings del landing (objetivo: que entre todo en una pantalla mobile).
- Wizard `/afiliarse`: edificio pasa a ser el **primer campo obligatorio del paso 1** (dispara el lookup de delegados). Zod: `edificioUdai` con `min(2)`. `EdificioCombo` recibe props `required` + `error`.

## ⚠️ PENDIENTE — turno del user antes de validar push y email

### A) Web Push (VAPID) — código deployado, env vars sin configurar en Vercel

Las VAPID keys ya están generadas y en `.env.local` (formato corregido en sesión tarde). Falta:

1. **Pegar 3 env vars en Vercel** (Production + Preview + Development):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = (mismo valor que .env.local)
   - `VAPID_PRIVATE_KEY` = (secreto, sin prefijo `NEXT_PUBLIC_`)
   - `VAPID_SUBJECT` = `mailto:apops@apops.org.ar`
2. **Redeploy** desde Vercel (con "Use existing Build Cache" desactivado).
3. **Probar**: instalar PWA → /perfil → "Activar notificaciones" → mandar desde otra cuenta → verificar que llega al SO.

Sin las keys el botón en /perfil dice "Notificaciones push no configuradas" en amber, las notif in-app siguen funcionando.

### B) Email transaccional (Resend) — DECIDIDO POSPONER

Decisión 2026-05-15 (sesión tarde): el código de envío de mail con PDF firmado está deployado pero **el setup de Resend queda pendiente para más adelante**. Mientras tanto:

- La solicitud `/afiliarse` se guarda OK en DB.
- En `/afiliarse/exito` aparece banner amber: "La solicitud quedó guardada, pero no pudimos mandar el mail de confirmación".
- El admin la ve igual que siempre en `/admin` y la procesa manualmente.
- El PDF se genera del lado servidor pero no se envía a ningún lado (los 3 envíos hacen `skipped: 'no_resend_config'`).

Cuando se quiera activar:

1. **Crear cuenta en https://resend.com** (free tier: 3k mails/mes con dominio verificado, 100/día sin verificar).
2. **Verificar dominio `apops.org.ar`** en el dashboard de Resend (te da unos TXT + DKIM para agregar al DNS donde está hosteado el dominio).
3. **Generar API key** en Resend (Dashboard → API Keys → Create).
4. **2 env vars en Vercel** (Production + Preview + Development):
   - `RESEND_API_KEY` = `re_xxx...`
   - `EMAIL_FROM` = `APOPS Siempre <noreply@apops.org.ar>` (cualquier alias del dominio verificado).
5. **Redeploy** desde Vercel.
6. **Probar**: enviar `/afiliarse` con un email propio → debería llegar PDF al aspirante, a `apops@apops.org.ar` y a los delegados del edificio declarado (si hay match en padrón).

Verificar el dominio puede llevar minutos u horas según el proveedor DNS. Mientras no esté verificado, Resend solo permite enviar a la dirección owner de la cuenta (modo sandbox — útil para test inicial).

## Próxima sesión — Testing y mejoras

Objetivo de la próxima sesión: **suite de tests + refinamientos**.

### Prioridades sugeridas

**1. Tests unitarios (Fase 1B retomar)** — ya teníamos pausado:
- Server actions con mocks de Supabase: `loginConClave`, `registrar`, `solicitarMagicLink`, `cambiarClave`, `enviarNotificacion`, `subirPadron`, `subirAdherentes`, etc.
- Parser xlsx contra fixtures sintéticos (corner cases: DNI vacío, vínculos inválidos, fechas raras).
- Helpers puros del dashboard: `gremioLabel`, `colorForRatio`, `provinciaToGeojsonName`, `deltaPct`.

**2. Tests de integración** (Playwright o vitest con stack supabase mockeado):
- Flujo completo: registro + login + ver credencial.
- Flujo afiliación online (wizard 3 pasos + firma).
- Flujo carga padrón → ver dashboard.
- Flujo notificación admin → afiliado (in-app).

**3. Tests RLS**:
- Padrón solo lo lee service_role.
- Afiliados solo ven datos propios (self-only).
- Push subscriptions solo el dueño.
- Hilos de notificación solo participantes.

**4. Refinamientos detectados en uso**:
- VAPID push real (post setup) — verificar end-to-end.
- Si el push funciona, agregar opt-in suave post-login (banner en /feed la primera vez).
- Mejoras menores que aparezcan al usar.

### Sugerencia de orden

1. Validar deploy actual end-to-end (Vercel verde, app funciona).
2. Setup VAPID + probar push.
3. Tests unitarios de server actions críticas (auth + padron).
4. Tests del parser con fixtures.
5. Integración + RLS.

### Cleanup pendiente

- Eliminar `data/ministerio.xlsx` cuando ya no haga falta probar (queda gitignored).
- `.env.cloud` borrar después de cada uso (gitignored igual).
- AGENTS.md sigue desactualizado — declara "sistema de tickets" como núcleo, la realidad es "credencial + comunicación + dashboard CD + carga padrón + push". Actualizar.
- Sistema viejo `mensajes_delegado` coexiste con el nuevo de `hilos_notificacion`. Es deuda técnica. Decidir si migrar o mantener.

## Bootstrap automático del agente

El protocolo de bootstrap está en [CLAUDE.md](CLAUDE.md). Cuando digas "retomá":

1. Leer este RESUME.md
2. `git pull origin main`
3. `npx tsc --noEmit`
4. Reportar status + preguntar antes de codear

**El usuario no debería tener que escribir comandos manuales.**

## URLs útiles

- **App live**: https://apops.vercel.app
- **Demo software**: https://apops.vercel.app/software
- **Health check**: https://apops.vercel.app/api/health
- **Vercel dashboard**: https://vercel.com/saadypacheco-4143s-projects/apops
- **Supabase dashboard**: https://supabase.com/dashboard/project/pozbdplbichrhojjeqiv
- **Repo**: https://github.com/saadypacheco/apops

## Decisiones técnicas tomadas en esta sesión

- **Snapshots de padrón inmutables**: cada Excel se preserva como snapshot. La vista `padron_cotizantes_actual` siempre apunta al más reciente cronológicamente.
- **Legajo es el ID primario del padrón**, no DNI. ANSES manda algunas filas sin DNI (0.12%).
- **DNI nullable en `padron_cotizantes`**, NOT NULL en `afiliados` (los registrados tienen DNI sí o sí).
- **Adherentes en archivo separado del padrón**, no en hoja del mismo Excel. Razón: padron ANSES viene de sistema externo que no controlamos; adherentes son data interna del gremio.
- **Auto-baja al desaparecer del padrón**: si un afiliado activo no aparece en el nuevo snapshot, se le setea `estado='baja'` + `fecha_baja=now`. Sin requerir confirmación admin.
- **Idempotencia de notif a delegados**: chequeo de hilo existente en últimas 24h + skip si es reemplazo (`force=true`). Doble safety.
- **VAPID via env vars con fail gracefully**: si las keys no están, push silenciosamente se saltea. La app sigue funcionando.
- **PWA install button reusable** con detección de plataforma + modal de instrucciones para iOS (que no permite prompt programático).
- **Cap PostgREST de 1000 filas**: paginar en chunks vía helper `fetchAllRows`. Aplicado en todas las queries del dashboard.

## Lecciones / anti-patterns capturados

- 🐛 **Lint de Next bloquea Vercel deploys silenciosamente**: `npm run lint` en local antes de pushear ahorra 30 min de "¿por qué no sube?". El error fue una var no usada.
- 🐛 **PostgREST cap 1000 ignora `.range(0, 50000)`**: tenés que paginar real, no inflarlo via range. Fallaba sin warning, solo "menos filas que las esperadas".
- 🐛 **`xlsx` npm vs SheetJS CDN**: el paquete `xlsx` en npm tiene CVEs sin parchear (Prototype Pollution + ReDoS). Las versiones nuevas viven solo en `cdn.sheetjs.com`. Instalar con `npm i https://cdn.sheetjs.com/xlsx-X.Y.Z/xlsx-X.Y.Z.tgz`.
- 🐛 **Manifest de PWA cachea agresivo en Chrome**: cambios en `manifest.json` no se ven hasta hard refresh (Ctrl+Shift+R) o click "Update" en DevTools → Application → Manifest.
- 🐛 **TS strict + PushManager.subscribe**: el tipo `BufferSource` es estricto con `ArrayBuffer` puro (no `SharedArrayBuffer`). Cast explícito `Uint8Array.buffer as ArrayBuffer` resuelve.
- 🔑 **Vista PostgREST inferida con todas las columnas nullable**: aunque la tabla base sea NOT NULL. Cast explicit con type narrowing en server actions críticas.

## Commits clave de esta sesión

```
0d63107 feat(ux): FAB instalar app + landing compacta + edificio obligatorio paso 1
8d558fe feat(afiliacion): envío de PDF firmado por mail al recibir solicitud
16d3508 feat(afiliacion+fab): wizard 3 pasos minimizando required + FAB contacto APOPS
811966e feat(push): Web Push real con VAPID — infra + UI + hooks
ed9b991 feat(adherentes): fix duplicados notif + seed demo + flujo de carga
4cbd8b5 feat(pwa): screenshots para Richer PWA Install UI
f515e95 feat(pwa): botón "Instalar app" reusable + sumado a landing y /software
ea67315 feat(pwa): app instalable — iconos + service worker + register
27aefdf feat(notif): enriquecer notif altas/bajas + búsqueda inbox
602ecd1 feat(notif): plantillas rápidas en /notificaciones/nueva para admin
416343f feat(padron): notif in-app a delegados ante altas/bajas en su edificio
feb0454 feat(admin): /admin/cotizantes — listado con búsqueda + filtros + paginación
494804e feat(dashboard): bar chart altas/bajas por mes en tab Evolución
2defb04 feat(dashboard): selector de período
e2dc0f2 feat(dashboard): heatmap edificios × métricas + cards vs objetivo
872021a feat(dashboard): tab Eventos del mes — cumpleaños + aniversarios
4a8e1c7 feat(dashboard): line chart evolución por gremio
fac3828 feat(dashboard): KPI cards con icon + delta + donut gremios + footer
4b43c30 feat(dashboard): sidebar lateral colapsable
af374ce feat(dashboard): fix cap PostgREST + mapa SVG Argentina
5de7960 feat(dashboard): B1 — métricas CD + migration 0030
2b2dcec feat(padron): A3 — UI /admin/padron upload
26b160a feat(padron): A2 — parser xlsx + server action subirPadron
37891b0 feat(padron): histórico — snapshots, vista actual, afiliados.fecha_baja
b655718 test: fase 1A — borra suite v1 + 64 tests unitarios
```

## Para el agente de la próxima sesión — checklist

1. Bootstrap automático (CLAUDE.md): leer RESUME, `git pull`, `tsc --noEmit`, reportar.
2. Si el user pendiente lo hizo (VAPID en Vercel), validar push real end-to-end.
3. Si no, arrancar con suite de tests (Fase 1B) — server actions críticas + parser xlsx + helpers puros del dashboard.
4. Tests RLS son los más importantes para producción real con datos sensibles.
5. Si hay feedback del cliente posterior a esta sesión, ESO tiene prioridad sobre los tests.
