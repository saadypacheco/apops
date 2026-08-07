# AGENTS.md — APOPS Siempre

> Briefing del proyecto para cualquier agente de IA (Claude Code, Copilot, Cursor)
> que trabaje en este repositorio. Lectura obligatoria al inicio de cada sesión.
>
> **Versión:** 3.0 · **Fase activa:** 0 — Setup con Spec Kit
> **Metodología:** Spec-Driven Development con GitHub Spec Kit v0.8.2

---

## 1. Identidad y misión

**APOPS Siempre** es la PWA del gremio APOPS (Asociación del Personal de los
Organismos de Previsión Social), único gremio específico de ANSES en Argentina.

**Núcleo del producto:** un sistema de **consultas tipo ticket** entre afiliados
y delegados, con seguimiento real de cada caso. Reemplaza la comunicación
desordenada por WhatsApp con un flujo estructurado, simple y trazable.

**Lo que NO es:**
- No es una web informativa.
- No es un chat tipo WhatsApp.
- No es una plataforma transaccional (no se reservan hoteles ni se tramitan
  préstamos desde acá). Sí muestra el **catálogo de beneficios** del gremio
  como directorio informativo, con link al trámite en apops.org.ar.

**Misión:** que el afiliado tenga al gremio presente todos los días, con
respuestas con respaldo oficial. Que el delegado deje de improvisar y trabaje
con una herramienta operativa. Que la información del gremio sea oportuna,
oficial y confiable.

---

## 2. Tipos de usuario y roles

El modelo separa dos conceptos distintos:

### Tipos de afiliado (uno por usuario, define situación laboral)

| Tipo | Descripción | Cómo se identifica en padrón | Mensaje central |
|---|---|---|---|
| `activo` | Trabajador de ANSES afiliado APOPS, paga cuota por descuento de haberes | `APOPS = x` | "Te enterás primero, con respaldo oficial" |
| `jubilado` | Jubilado afiliado APOPS, paga cuota por transferencia | `cotiza_papel = x` | "Seguís siendo parte, con la accesibilidad que necesitás" |

> **Importante**: solo los activos (con descuento) y los jubilados (con cotización
> por papel) son afiliados APOPS. Personas que renuncian sin jubilarse o que
> cotizan a otro gremio (ATE, SEC, UPCN, SECASFPI) **no son afiliados APOPS** y
> quedan en `pendiente_validacion` si intentan ingresar.

### Roles (combinables, definen capacidades en la app)

Un usuario puede tener varios roles simultáneamente
(ej: `afiliado` + `delegado`, `afiliado` + `prensa`).

| Rol | Capacidades agregadas sobre el rol anterior |
|---|---|
| `afiliado` | Crear consultas, ver historial, recibir notificaciones, credencial digital |
| `delegado` | Inbox de consultas de su delegación, responder, cambiar estado, notas internas, etiquetar afiliados, broadcast unidireccional a su delegación |
| `prensa` | Crear comunicados, definir prioridad y público objetivo |
| `comision_directiva` | Mismas capacidades que prensa + dashboard de métricas |
| `admin` | Padrón, configuración, auditoría |

### Público (no es usuario)

La ciudadanía general puede consumir contenido abierto si se publica como tal,
pero **no se loguea**. En MVP no hay portal público — todo el contenido vive
detrás del login.

---

## 3. Stack y por qué

```
Frontend     : Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend      : Supabase (auth + postgres + realtime + edge functions)
Push         : Web Push API nativa + VAPID
Deploy       : Vercel (frontend) + Supabase Cloud (backend)
PWA          : next-pwa o configuración manual del service worker
Auth         : Supabase Auth con magic link
```

**Decisiones tomadas y por qué (no cambiar sin actualizar este archivo):**

| Elección | Alternativa descartada | Razón |
|---|---|---|
| PWA | App nativa (React Native / Flutter) | Un codebase, sin stores, actualizaciones instantáneas, menor costo |
| Supabase | FastAPI + Postgres propio | Auth + DB + realtime + edge sin servidor propio que mantener |
| Web Push nativo | Firebase Cloud Messaging | Sin dependencia de Google, estándar abierto, respeta privacidad |
| Magic link | Usuario + contraseña | Afiliados mayores no recuerdan contraseñas |
| Vercel | Netlify, Railway, VPS | Zero-config con Next.js, CDN global, previews por PR |
| Next.js 14 App Router | Pages Router, Remix | Server Components, mejor performance |

**Stack diferido (no en MVP):**

| Tecnología | Cuándo entra |
|---|---|
| Claude API (`claude-sonnet-4-6`) | Cuando se evalúe asistencia IA al delegado en respuestas (post-MVP) |
| Mercado Pago | Solo cuando exista flujo de cuota adherente (módulo retención, post-MVP) |

> Las **versiones específicas** de cada librería viven en `package.json`.
> Los **principios técnicos inviolables** viven en `.specify/memory/constitution.md`.
> El **modelo de datos detallado** vive en `specs/NNN-feature/data-model.md` por feature.

---

## 4. Convenciones de organización

Esto no es la estructura final del proyecto — esa emerge del `plan.md` de cada
feature. Esto es la **filosofía** que el agente debe respetar al proponer estructura.

- **Mobile-first.** Diseñado primero para 375 px de ancho.
- **Pensado para personas no técnicas y mayores.** Tipografía legible, botones
  grandes, lenguaje claro sin tecnicismos, navegación de máximo 4-5 tabs.
- **Server Components por defecto.** Solo marcar `'use client'` donde haga falta interactividad.
- **Componentes agrupados por dominio,** no por tipo. (`components/consultas/ConsultaCard.tsx`,
  no `components/cards/ConsultaCard.tsx`.)
- **`lib/` para integraciones externas.** Una carpeta por integración, con su propio cliente y helpers.
- **`hooks/` solo si el hook es reutilizable** entre componentes. Si es específico de un componente, vive al lado de él.
- **Edge Functions de Supabase para lógica server-side sensible** (envío de push, validaciones contra padrón). Nunca en Next.js API routes con la `service_role_key`.
- **Migraciones SQL versionadas** en `supabase/migrations/` con timestamp prefix.
- **Priorizar acción sobre información.** Cada pantalla principal tiene un CTA claro. Sin elementos decorativos.

---

## 5. Flujos de autenticación

El sistema tiene **dos flujos diferenciados** según situación laboral del afiliado.

### Flujo 1 — Afiliado activo (con legajo)

```
1. Usuario ingresa DNI + Legajo
2. Backend valida contra padrón activo
3. Si válido → usuario ingresa email
4. Login mediante magic link (sin contraseña)
```

### Flujo 2 — Afiliado sin legajo (jubilado APOPS, cotiza por transferencia)

UI ofrece opción visible: **"No tengo legajo"**.

```
1. Usuario ingresa DNI
2. Backend valida contra padrón de afiliados no activos
3a. Si existe → continúa
3b. Si no existe → estado pendiente_validacion (queue manual)
4. Usuario ingresa email
5. Login mediante magic link
```

> El **detalle técnico de tablas, RLS y endpoints** del flujo de auth vive en
> `specs/NNN-auth/` cuando se implemente. AGENTS.md describe la lógica de negocio.

---

## 6. Restricciones explícitas (qué NO se construye)

Lista declarada para prevenir scope creep en `/speckit-specify`. Si una idea
nueva entra acá, requiere actualización formal de este AGENTS.md y discusión
explícita.

| Fuera de scope | Estado |
|---|---|
| Préstamos / créditos | Permanente — no se construye |
| Reservas / transacciones de turismo | Permanente — no se construye. El catálogo de beneficios (incluido turismo) SÍ existe desde 2026-08-07: es un directorio informativo con link externo, no un motor de reservas. |
| Chat libre / chat grupal | Permanente — el modelo es ticket, no chat |
| Funcionalidades decorativas | Permanente — toda feature debe justificar valor operativo |
| Asistencia IA al delegado | Diferido — se evaluará post-MVP |
| Módulo retención retiro voluntario (calculadora, asesoramiento, red ex-ANSES) | Diferido — fase post-MVP |
| Portal público / asistente ciudadanía | Diferido — fase post-MVP |

---

## 7. Protocolo del agente al iniciar sesión

Al abrir una nueva conversación, el agente debe seguir este orden **antes** de
ejecutar cualquier comando o cambio:

1. **Leer este `AGENTS.md` completo.**
2. **Leer `.specify/memory/constitution.md`** si existe (principios inviolables).
3. **Verificar §11 (Estado activo)** de este archivo para saber dónde quedó el trabajo.
4. **Si hay una feature en progreso** en `specs/NNN-*/`, leer su `spec.md`,
   `plan.md` y `tasks.md` activos.
5. **Confirmar con el desarrollador** la próxima acción antes de avanzar.
   No iniciar `/speckit-implement` ni hacer commits sin confirmación explícita.

**Si el agente no sabe algo, pregunta.** Inventar es peor que pausar.

---

## 8. Gates humanos del flujo SDD

La metodología tiene **gates inviolables** donde el agente debe pausar y esperar
aprobación humana. Si el agente intenta saltearlos, está rompiendo la metodología.

| Gate | Cuándo dispara | Qué se revisa |
|---|---|---|
| **Clarify** | Después de `/speckit-specify` | Que `spec.md` no tenga marcadores `[NEEDS CLARIFICATION]` sin resolver |
| **Plan review** | Después de `/speckit-plan` | `data-model.md` (formas normales 1NF/2NF/3NF, CASCADE, RLS), `contracts/api-spec.json` (tipos exactos, errores cubiertos) |
| **Analyze** | Recomendado antes de `/speckit-tasks` | Findings CRITICAL deben resolverse. WARNING se evalúan. |
| **Cleanup** | Después de `/speckit-implement` | Quality gate del PR antes de mergear |
| **Checklist** | Antes de mergear | Acceptance criteria de `spec.md` validados |

Cuándo es **legítimo** saltear `/speckit-clarify`: solo en spikes exploratorios
donde el código resultante es desechable, declarándolo explícitamente.

---

## 9. Alcance del MVP

El MVP cubre exactamente **6 módulos**. Nada más entra hasta que estos 6 estén
en producción y validados.

| # | Módulo | Para quién | Por qué primero |
|---|---|---|---|
| 1 | Registro + login (dos flujos) | Todos los tipos | Sin auth, ningún módulo funciona |
| 2 | **Consultas + seguimiento** (NÚCLEO) | Afiliado ↔ Delegado | Es la razón de ser del producto |
| 3 | Dashboard del delegado | Delegado | Sin dashboard operativo, las consultas no se gestionan a escala |
| 4 | Comunicados básicos | Prensa / CD → Afiliados | Es el reemplazo de la cadena de WhatsApp |
| 5 | Notificaciones | Todos | Sin push, los comunicados y consultas no llegan |
| 6 | Credencial digital con QR | Afiliado | Identifica al afiliado en presencia (sede, eventos) |

### Estructura conceptual de datos del MVP

Entidades principales (los detalles van a `specs/*/data-model.md` por feature):

`usuarios`, `roles`, `usuarios_roles`, `delegaciones`, `consultas`, `respuestas`,
`notas`, `etiquetas`, `comunicados`, `notificaciones`.

Relación clave: **usuario → delegación → delegado**. La asignación
afiliado→delegado es **automática por delegación**, nunca manual.

### Roadmap post-MVP (no comprometido a fechas)

- Módulo retención (calculadora retiro, asesoramiento, kit bienvenida adherente, red ex-ANSES)
- Asistencia IA al delegado (respuestas sugeridas con Claude API)
- Portal público / asistente ciudadanía previsional
- Cuota adherente con Mercado Pago

---

## 10. Política de notificaciones (principio rector)

**Evitar saturación.** Solo se notifica:

- Cambios de estado en consultas propias del afiliado (recibido / en proceso / respondido).
- Comunicados con prioridad `crítico` o `importante`.
- Recordatorios institucionales relevantes.
- Cumpleaños del afiliado.

Lo demás vive en el feed sin push. **El comportamiento técnico exacto por
nivel de prioridad** se define en la constitución y en el `plan.md` del módulo
de comunicados.

---

## 11. Estado activo

**Fase:** Feature **001-afiliado-auth** completa (Phases 1-6, T001-T078).
**Próximo paso:** revisar PR a `main`. Luego `/speckit-specify` para feature siguiente — candidata: consultas (núcleo del producto).
**Bloqueado por:** revisión humana de Saady (a11y manual con NVDA, pasada visual de pantallas, push y PR).
**Última actualización:** 2026-05-04. 62 tests verde, lint+typecheck OK, bundle 87-99 kB, Lighthouse thresholds (90/85/90) configurados en CI.

**Follow-ups abiertos** (no bloquean merge de la feature):
- Pasada NVDA/VoiceOver sobre `/login`, `/login-sin-legajo`, `/email`, `/perfil`.
- Tests Playwright e2e + axe-core integration.
- Feature 002 — sistema de roles real (reemplaza `roles_admin` stub de migración 0017).
- Panel admin para resolver pendientes (la API ya existe).
- Reactivar Storage cuando entre feature con archivos.

> Esta sección se actualiza al inicio o final de cada sesión de trabajo.
> Si tiene más de 3 líneas, mover el detalle a `docs/progreso.md`.

---

## 12. Cómo actualizar este archivo

Este archivo es **el contrato de proyecto**. Se actualiza cuando:

- **Se aprueba un cambio en la constitución** → reflejar la implicación acá si
  afecta a un tipo, rol, decisión de stack, o convención.
- **El stack cambia** → actualizar §3 con la nueva razón en la tabla de "por qué".
- **Aparece o desaparece un tipo de afiliado o rol** → §2.
- **Una restricción se levanta o se agrega** → §6 (con justificación).
- **Cambia el alcance del MVP** → §9 (requiere justificación explícita).
- **Cambia el estado activo del proyecto** → §11 (siempre).

Lo que **no** va acá:
- SQL de tablas → `specs/NNN-*/data-model.md`
- Estructura específica de carpetas → `specs/NNN-*/plan.md`
- Variables de entorno → `.env.example`
- Comandos npm/pnpm → `package.json` scripts
- Wireframes / mockups → `specs/NNN-*/wireframes/` cuando se construya cada módulo
- Listas de TODOs detalladas → `docs/progreso.md` o `tasks.md` de cada feature
