<!--
SYNC IMPACT REPORT
==================
Version change: (none, initial) → 1.0.0
Bump rationale: First ratified version of the constitution. No prior version exists.

Modified principles: N/A (initial version)
Added sections:
  - Core Principles (I through VII)
  - Stack Constraints
  - Development Workflow & Quality Gates
  - Governance

Removed sections: N/A

Templates requiring updates:
  - .specify/templates/plan-template.md       ✅ no changes needed (Constitution Check is dynamic placeholder)
  - .specify/templates/spec-template.md       ✅ no changes needed (generic User Stories structure aligns)
  - .specify/templates/tasks-template.md      ✅ no changes needed (phase structure aligns with principle VI on tests)
  - AGENTS.md                                 ✅ already aligned (v3.0, 2026-04-30)
  - docs/bitacora-sdd.md                      ⚠ pending — log this constitution as Step 13

Follow-up TODOs: none. All placeholders resolved with concrete project values.

Suggested commit message:
  docs: ratify project constitution v1.0.0 (7 principles + stack constraints + governance)
-->

# APOPS Siempre Constitution

## Core Principles

### I. Foco operativo

Toda funcionalidad MUST servir directamente al núcleo del producto (consultas
afiliado ↔ delegado) o a su soporte estrictamente necesario (auth, padrón,
notificaciones de consulta, comunicados oficiales, credencial digital).

Las restricciones declaradas en `AGENTS.md §6` (NO préstamos, NO turismo, NO chat
libre, NO funcionalidades decorativas, IA al delegado diferida, módulo retención
diferido, portal público diferido) son inviolables salvo amendment formal de
esta constitución con bump de versión MINOR o MAJOR.

**Rationale**: productos gremiales tienen presión política y comunitaria para
"agregar todo lo que alguien pidió". Sin un principio que ancle el foco, el
producto se infla feature por feature y pierde su razón de ser. Esta regla da
herramienta explícita para decir no.

### II. Simplicidad para usuarios no técnicos

La UX MUST estar optimizada para personas mayores y no técnicas. Concretamente:

- Tipografía base mínima 16 px, escalable hasta 22 px sin romper layout.
- Touch targets mínimo 44 × 44 px en todo elemento interactivo.
- Contraste WCAG AA en todos los textos (≥ 4.5:1 normal, ≥ 3:1 grande).
- Lenguaje claro sin tecnicismos. Ejemplo: "Hacer una consulta" en lugar de
  "Crear ticket".
- Navegación principal de máximo 5 tabs por rol.
- Cada pantalla principal MUST tener un CTA primario evidente.

**Rationale**: la audiencia incluye afiliados jubilados con baja literacia
digital. UX compleja = afiliados que no usan la app = el producto fracasa.

### III. Cero secretos hardcodeados (NON-NEGOTIABLE)

Toda credencial (Supabase keys, VAPID, futuras API keys) MUST vivir en:

- `.env.local` durante desarrollo (gitignored)
- Variables de entorno de Vercel y Supabase Cloud en producción

`.env.example` MUST documentar toda variable requerida sin valores reales.
`.gitignore` MUST cubrir `.env*`, `*.key`, `*.pem`, `secrets.json`,
`credentials.json` antes del primer commit.

Toda PR que introduzca un secreto en código fuente MUST ser rechazada hasta
que se mueva a variable de entorno.

**Rationale**: un secreto en historial de git es costoso de remediar (rewrite +
rotación de claves). El reporte previo de proyectos del autor mostró este
patrón en 3 de 4 proyectos — se corta acá de raíz.

### IV. RLS obligatorio en Supabase (NON-NEGOTIABLE)

Toda tabla creada en Supabase MUST tener Row Level Security activada con
policies explícitas antes de aceptarse en `main`.

- Ninguna tabla accesible por el rol `anon` salvo que sea explícitamente
  pública y se declare en su `data-model.md`.
- La `service_role_key` MUST usarse exclusivamente en Edge Functions de
  Supabase. Nunca en Next.js API routes ni expuesta al cliente.
- Toda policy MUST tener un test que valide el acceso permitido y al menos
  un test que valide el acceso denegado para roles inadecuados.

**Rationale**: sin RLS, un bug en cualquier query del frontend filtra el
padrón completo. RLS pone la defensa en la base de datos, donde un bug de
aplicación no puede saltarla.

### V. Privacidad por diseño (Ley 25.326)

El producto MUST cumplir Ley 25.326 (Protección de Datos Personales,
Argentina) en todo flujo que involucre datos de afiliados:

- NO se recolecta geolocalización del usuario.
- NO se rastrea actividad fuera del producto (sin Google Analytics, sin
  Facebook Pixel, sin trackers de terceros).
- Consentimiento de push notifications MUST ser explícito, con opción de
  rechazo claramente visible. Si el afiliado rechaza, NO se vuelve a pedir.
- Derecho a baja MUST estar accesible en máximo 2 tap/clicks desde el perfil.
- Datos personales (DNI, legajo, email) MUST cifrarse en tránsito (HTTPS) y
  estar protegidos por RLS en reposo.

**Rationale**: cumplimiento legal argentino + relación de confianza con el
afiliado. El gremio maneja datos sensibles del padrón; una filtración o un
uso indebido destruye la legitimidad del producto.

### VI. Tests para lógica crítica

Tests MUST existir y MUST correr en CI (sin `--passWithNoTests`) para:

- Edge Functions de Supabase
- Flujos de autenticación (ambos: con legajo y sin legajo)
- Lógica de envío y recepción de Web Push
- Validaciones contra padrón de afiliados
- Transición de estados de consultas (recibido → en proceso → respondido)
- Policies RLS (acceso permitido y acceso denegado por rol)

Tests NO son obligatorios para componentes de presentación pura sin lógica
condicional (ej: una `Card` que solo renderiza props).

Si un test runner está configurado (Jest, Vitest, etc.), CI MUST ejecutar
tests reales. Está prohibido `--passWithNoTests` salvo justificación
explícita en la PR.

**Rationale**: el reporte previo de proyectos mostró el patrón "tests
configurados pero no usados" como teatro de testing. Acá se corta: tests
obligatorios donde importa, opcionales donde no aporta valor real.

### VII. Performance y mobile-first medibles

Todo build de producción MUST cumplir, medido por Lighthouse en
`/` y en una ruta autenticada representativa:

- Lighthouse PWA ≥ 90
- Lighthouse Performance ≥ 85
- Lighthouse Accessibility ≥ 90

Si una PR baja cualquiera de esos números bajo el umbral, NO se mergea a
`main` hasta restablecerlo.

Diseño mobile-first: toda pantalla MUST diseñarse primero para 375 px de
ancho. Desktop es enriquecimiento, no la base.

**Rationale**: audiencia con celulares modestos y conectividad variable.
Performance no es estética, es accesibilidad. Sin pisos medibles, el
performance se degrada feature por feature.

## Stack Constraints

### Stack lockeado (cambia solo con amendment de la constitución)

- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Backend**: Supabase (auth + Postgres + Realtime + Edge Functions)
- **Notificaciones**: Web Push API nativa + VAPID
- **Auth**: Supabase Auth con magic link
- **Deploy**: Vercel (frontend) + Supabase Cloud (backend)
- **PWA**: Service Worker manual o `next-pwa`

### Alternativas explícitamente prohibidas

Para que ningún plan técnico sugiera estas alternativas en `/speckit-plan`:

| Categoría | Prohibido | Razón |
|---|---|---|
| Push | Firebase Cloud Messaging, OneSignal | Decisión consciente: Web Push nativo, sin dependencia de Google ni terceros |
| Cliente nativo | React Native, Flutter, Capacitor | El producto es PWA por decisión consciente (un codebase, sin stores) |
| Backend propio | FastAPI, Express, Nest.js | Supabase ya da auth + DB + realtime + edge; agregar backend propio duplica costo de mantenimiento |
| ORM externo | Prisma, Drizzle, TypeORM | Supabase typegen genera tipos TypeScript desde el schema; ORM extra es capa redundante |
| Librerías UI | MUI, Chakra UI, Ant Design | Tailwind + Radix primitives da control fino sin overhead de bundle |
| State managers | Redux, Zustand, Jotai, MobX | RSC + URL state + React state local alcanza para el scope MVP |
| Routing legacy | Next.js Pages Router | App Router elegido conscientemente por RSC + Server Actions |
| Auth alternativa | Usuario+contraseña, OAuth complejo | Magic link decidido por audiencia mayor; auth simple es feature, no limitación |

### Stack diferido (entra solo cuando aplique, no antes)

- **Claude API** (`claude-sonnet-4-6`): cuando se evalúe asistencia IA al delegado en respuestas (post-MVP)
- **Mercado Pago**: solo cuando exista flujo de cuota adherente (módulo retención, post-MVP)

## Development Workflow & Quality Gates

### Ciclo SDD obligatorio

Toda feature MUST atravesar el ciclo Spec-Driven Development de Spec Kit:

```
/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-analyze
  → /speckit-tasks → /speckit-implement → /speckit-cleanup → /speckit-checklist
```

Saltearse `/speckit-clarify` solo es legítimo en spikes exploratorios
declarados explícitamente, donde el código resultante es desechable.

### Gates humanos inviolables

| Gate | Cuándo dispara | Qué se revisa |
|---|---|---|
| Clarify gate | Después de `/speckit-specify` | `spec.md` no debe tener `[NEEDS CLARIFICATION]` sin resolver |
| Plan review gate | Después de `/speckit-plan` | `data-model.md` (formas normales 1NF/2NF/3NF, CASCADE, RLS), `contracts/api-spec.json` (tipos exactos, errores cubiertos) |
| Analyze gate | Antes de `/speckit-tasks` (recomendado) | Findings CRITICAL deben resolverse |
| Cleanup gate | Después de `/speckit-implement` | Quality gate del PR antes de mergear |
| Checklist gate | Antes de mergear | Acceptance criteria de `spec.md` validados |

### Pull Request review

- Toda PR a `main` MUST recibir compliance review humana antes del merge.
- El reviewer MUST verificar que la PR no viola ningún principio de esta
  constitución.
- El reviewer MUST verificar que las restricciones de Stack Constraints se
  respetan.

### Bitácora del proyecto

`docs/bitacora-sdd.md` MUST actualizarse al cierre de cada feature con los
pasos ejecutados, decisiones tomadas y desviaciones detectadas respecto a
esta constitución y al PDF de metodología.

## Governance

### Procedimiento de amendment

1. Toda modificación de esta constitución MUST documentarse en el commit
   correspondiente con justificación explícita en el cuerpo del mensaje.
2. Toda modificación MUST incluir Sync Impact Report (HTML comment al inicio
   del archivo) generado por el comando `/speckit-constitution`.
3. Toda modificación MUST incrementar la versión según semver:
   - **MAJOR** (X.0.0): cambio incompatible — eliminar un principio,
     redefinir governance, levantar una restricción de Stack Constraints.
   - **MINOR** (1.X.0): agregar un principio nuevo, expandir guidance
     materialmente.
   - **PATCH** (1.0.X): clarificar wording, corregir typos, refinamientos
     no semánticos.

### Aprobador

En la fase actual del proyecto (un único desarrollador), el aprobador de
amendments es el desarrollador del proyecto. Cuando se incorporen otros
desarrolladores, se actualizará este artículo con la regla de aprobación
multi-persona correspondiente.

### Compliance

- Toda PR que toque código fuente MUST verificar cumplimiento de esta
  constitución durante review.
- Toda violación intencional (ej: deuda técnica consciente) MUST justificarse
  en el `plan.md` de la feature afectada y dejar trazabilidad en
  `docs/bitacora-sdd.md`.
- La constitución supersede cualquier práctica anterior. En caso de
  conflicto entre código y constitución, **gana la constitución** — el código
  se ajusta.

**Version**: 1.0.0 | **Ratified**: 2026-04-30 | **Last Amended**: 2026-04-30
