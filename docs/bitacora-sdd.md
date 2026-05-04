# Bitácora de aprendizaje SDD — APOPS

> Documento de estudio. Captura cada paso que damos en el ciclo Spec-Driven
> Development con Spec Kit v0.8.2, con su justificación metodológica y las
> decisiones que tomamos por afuera del estándar.
>
> **Cómo se usa este archivo:**
> 1. Leer en orden cronológico para entender el flujo aplicado.
> 2. Antes de cada acción nueva, agregar una entrada con la justificación.
> 3. Al final del proyecto, comparar contra `docs/metodologia.md` (PDF) y
>    contra la documentación oficial de Spec Kit para detectar desviaciones
>    e identificar mejoras.

## Convenciones de marcado

Cada paso lleva un marcador que indica el origen de la decisión:

| Marca | Significado |
|---|---|
| 🟢 **SDD** | Prescrito por la metodología Spec-Driven Development o Spec Kit |
| 🟡 **Convención** | Buena práctica del ecosistema (Node, Next.js, web, seguridad) — no específica de SDD |
| 🔵 **Proyecto** | Decisión específica de APOPS o mía como mentor — no es estándar |

Si un paso es **mixto**, llevará varios marcadores con el desglose adentro.

---

## Fase 0 — Setup inicial

### Paso 1 — Diagnóstico del entorno 🔵

**Acción:** verificar qué herramientas están instaladas y en qué versión antes
de hacer cambios.

```bash
git --version
node --version
python --version
uv --version           # podía no estar
specify --version      # podía no estar
gh --version
```

**Por qué:** Saady viene de proyectos previos con metodología informal. Antes
de instalar nada conviene saber el punto de partida real (versiones, herramientas
faltantes, estado del repo). Esto no está en el PDF.

**Resultado en APOPS:** git ✓, node v20.19.6 ✓, Python 3.12.10 ✓, gh ✓. Faltaban
`uv` y `specify`.

---

### Paso 2 — Identificar la última versión estable de Spec Kit 🟢

**Acción:** consultar el último tag publicado en GitHub.

```bash
gh api repos/github/spec-kit/releases/latest --jq '.tag_name'
# v0.8.2
```

**Por qué:** PDF página 5 — *"Usar siempre un tag de versión específico para
estabilidad. La rama main puede incluir cambios no testeados."* Spec Kit publica
muy seguido (5 releases en 7 días al 2026-04-29).

**Cómo verificás en cualquier momento:** ese mismo comando.

---

### Paso 3 — Instalar `uv` (gestor de paquetes Python) 🟢

**Acción:**

```bash
pip install --user uv
```

**Por qué:** PDF página 5 — `uv` es el gestor que Spec Kit usa para instalarse
de forma persistente como CLI tool. El PDF muestra `pip install uv` o `brew install uv`.
Elegimos `--user` para evitar tocar el Python del sistema.

**Diferencia con el PDF:** el PDF no aclara `--user`. En Windows con Python de
python.org es más limpio instalar a user-site para no requerir admin.

**Cómo verificás:**

```bash
uv --version
```

---

### Paso 4 — Agregar `uv` y herramientas Python al PATH del usuario 🔵 *(específico Windows)*

**Acción:** persistir `C:\Users\User\.local\bin` y `C:\Users\User\AppData\Roaming\Python\Python312\Scripts`
en el User PATH de Windows con `setx` o equivalente PowerShell.

**Por qué:** en Linux/macOS pip suele dejar los binarios en una ruta ya en `$PATH`.
En Windows hay que agregarlas manualmente. El PDF no cubre esto porque asume
macOS/Linux por default.

**Cómo verificás:** abrir una nueva terminal y ejecutar `uv --version` y
`specify --version` directamente, sin paths absolutos.

---

### Paso 5 — Instalar Spec Kit pinneado 🟢

**Acción:**

```bash
uv tool install specify-cli --from "git+https://github.com/github/spec-kit.git@v0.8.2"
```

**Por qué:** PDF página 5. Pin a tag = reproducibilidad. `uv tool install` deja
el CLI persistente entre sesiones.

**Diferencia con el PDF:** el PDF muestra `@vX.Y.Z` como placeholder. Acá usamos
el tag actual (`v0.8.2`).

**Cómo verificás:**

```bash
specify --version
# specify 0.8.2
```

---

### Paso 6 — `specify init .` 🟢

**Acción:**

```bash
specify init . --integration claude --force
```

**Por qué:** PDF página 8 — comando obligatorio para crear la estructura
`.specify/`, los templates, los scripts y las skills del agente.

**Diferencias con el PDF:**

| PDF (~v0.6) | Realidad v0.8.2 |
|---|---|
| Flag `--ai claude` | `--integration claude` |
| Skills en `.specify/agents/` | Skills en `.claude/skills/` |
| `CLAUDE.md` rico, escrito por humano | `CLAUDE.md` minimal, auto-managed |
| Templates bajados de GitHub | Templates **bundled** en el CLI |
| Scripts en bash (`.sh`) | Scripts auto-detectados; en Windows: PowerShell (`.ps1`) |

**Cómo verificás:**

```bash
ls .specify/templates/    # debe haber 5 templates
ls .claude/skills/        # debe haber ~14 skills speckit-*
cat .specify/integration.json    # confirmá integration: claude
```

---

### Paso 7 — `.gitignore` robusto antes del primer commit 🟡 *(convención del ecosistema)*

**Acción:** crear `.gitignore` con patrones para `.env*`, `*.key`, `*.pem`,
`node_modules/`, `.next/`, `.supabase/`, `.vercel/`, `.claude/settings.local.json`,
etc.

**Por qué:** SDD habla de "no hardcodear credenciales" como principio constitucional,
pero **no prescribe `.gitignore` patterns** — eso es convención del ecosistema Node.
Lo hicimos antes del primer commit porque un secreto que entra al historial es
costoso de remover (requiere rewrite + rotación de claves).

**No está en el PDF.** Es decisión del especialista basada en best practices web.

**Cómo verificás:**

```bash
git status
# Debe NO listar archivos .env, *.key, etc., aun si existen.
```

---

### Paso 8 — `.env.example` como plantilla pública 🟡 *(convención del ecosistema)*

**Acción:** crear `.env.example` con todas las variables documentadas pero
**sin valores reales**.

**Por qué:** convención de la comunidad Node. Permite que nuevos miembros del
equipo o el agente sepan qué variables necesitan, sin exponer secretos.

**No está en el PDF.** SDD nunca menciona `.env.example`.

---

### Paso 9 — Renombrar `master` → `main` y agregar remote 🟡

**Acción:**

```bash
git branch -m master main
git remote add origin https://github.com/saadypacheco/apops.git
```

**Por qué:** GitHub usa `main` por default desde 2020. `specify init` deja la
branch como `master` (default de git). Es buena práctica alinear.

**No está explícito en el PDF.** El PDF menciona "git push origin main" pero no
aclara que `specify init` usa master.

---

### Paso 10 — Pivot de scope: APOPS Siempre como producto completo 🔵 *(decisión del proyecto)*

**Fecha:** 2026-04-30

**Acción:** redefinición del alcance del producto. AGENTS.md pasa a v3 con cambios
estructurales.

**Lo que cambió:**

| Antes (v2) | Ahora (v3) |
|---|---|
| Nombre del producto: APOPS PWA | **APOPS Siempre** (era sub-módulo, ahora es la app entera) |
| 5 públicos primer-nivel | **Tipos** (`activo` / `jubilado` / `ex_empleado`) **y Roles combinables** (`afiliado` + `delegado`, etc.) |
| Núcleo difuso ("comunicados + comunidad") | **Núcleo: consultas tipo ticket** afiliado ↔ delegado |
| Plan de 6 fases con duraciones | **MVP de 6 módulos** explícito; resto en roadmap sin fechas |
| Auth genérico magic link | **Dos flujos diferenciados**: DNI+legajo (activo) vs "no tengo legajo" (jubilado/ex) |
| Sin restricciones declaradas | **Restricciones explícitas** (NO préstamos, NO turismo, NO IA en MVP, NO chat libre, NO retención en MVP, NO portal público en MVP) |
| Claude API en stack core | Claude API **diferida** a post-MVP |
| Mercado Pago en Fase 2 | Mercado Pago **diferido** hasta que exista flujo de cuota adherente |

**3 decisiones clave del pivot (vía AskUserQuestion):**
1. APOPS Siempre = la PWA completa (no sub-módulo)
2. Módulo de retención de retiro voluntario → fuera del MVP, fase futura
3. IA delegado → pospuesta a fase futura, no eliminada

**Por qué es importante metodológicamente:** SDD/Spec Kit no documenta
explícitamente cómo manejar un pivot de alcance ANTES de la constitución.
Lo correcto fue:
- Pausar antes de `/speckit-constitution` (no codificar principios sobre un scope viejo).
- Auditar con preguntas de mentor las ambigüedades.
- Reescribir AGENTS.md para que `/speckit-constitution` reciba el briefing actualizado.
- Capturar en esta bitácora la trazabilidad de la decisión.

Si el pivot hubiese llegado **después** de tener constitución y specs, el camino
correcto era distinto: revisar constitución, ajustar specs viva afectadas, correr
`/speckit-analyze` para detectar inconsistencias. Ahora ahorramos ese retrabajo.

---

### Paso 11 — Auditar y reescribir `AGENTS.md` 🔵 *(decisión propia)*

**Acción:** crítica del borrador del usuario, identificación de gaps respecto a
la metodología SDD, reescritura en v2 con 11 secciones.

**Por qué:** PDF página 8 — *"Antes de correr cualquier comando Spec Kit, el
AGENTS.md del proyecto debe estar en la raíz del repositorio."* SDD **no define
una estructura canónica de AGENTS.md** — la armamos nosotros como especialistas.

**Diferencias respecto al borrador original:**

| Borrador → v2 | Por qué |
|---|---|
| SQL completo del modelo de datos → eliminado | El SQL va a `specs/*/data-model.md`, no al briefing |
| Árbol detallado de carpetas → convenciones de organización | La estructura emerge del plan por feature |
| Lista de env vars → eliminada | Ya está en `.env.example` |
| Paleta visual y principios → eliminada | Va a `constitution.md` |
| Reglas críticas mezcladas → divididas: principios → constitución; convenciones → plan | La constitución es el único artefacto inviolable |
| Checklist con `[x]/[ ]` → §10 estado activo (3 líneas) | Las listas largas escalan mal |
| (nuevo) §6 Protocolo del agente | Lo que estaba en CLAUDE.md, ahora en el lugar correcto |
| (nuevo) §7 Gates humanos del flujo SDD | Para que el agente no se saltee `clarify` "para ir más rápido" |
| (nuevo) §11 Cómo actualizar este archivo | Define cuándo y qué se modifica |

**Decisión revertida:** una versión incluía §6 "Lecciones de proyectos previos".
Saady la cuestionó: AGENTS.md debe ser briefing **timeless** del proyecto, no
bitácora histórica. Las lecciones son insumo para `/speckit-constitution`, no
parte del briefing. La sección se eliminó. *(Esta bitácora absorbe esa
información en su lugar.)*

---

## Lo que viene

### Paso 12 — Agregar `docs/metodologia.md` al repo 🔵

Versión markdown de la metodología (PDF). Anotar las diferencias detectadas
con v0.8.2 (Pasos 6 y otros).

### Paso 13 — `/speckit-constitution` ejecutado 🟢

**Fecha:** 2026-04-30 · **Resultado:** `.specify/memory/constitution.md` v1.0.0

**Lo que hizo la skill (operatoria normal):**
1. Disparó pre-hook obligatorio `/speckit-git-initialize` (mandatory por
   `extensions.yml`). El script detectó repo ya inicializado y skipeó.
2. Cargó el template con placeholders `[PROJECT_NAME]`, `[PRINCIPLE_X_NAME]`, etc.
3. Recolectó valores desde AGENTS.md y desde la conversación.
4. Escribió Sync Impact Report como HTML comment al inicio del archivo.

**Decisiones tomadas durante el comando (no obvias del PDF):**

- **App Router vs Pages Router**: lockeado App Router por Server Components +
  Server Actions, no por el hecho de ser PWA. Diferencia esperable de bundle
  para audiencia con celulares modestos.
- **Supabase Free tier**: la duda de costo se resolvió aclarando que Free tier
  alcanza para todo el MVP/beta. Pro ($25/mes) recién en escala real.
- **PWA descargable**: el "feel descargable" se logra vía `Add to Home Screen`
  nativo del browser, sin necesidad de APK. La duda surgió comparando con
  GestionOrdenes (que es RN+EAS pero igual tiene backend en alerthor.net).
- **ORM externo, librerías UI pesadas, state managers externos**: prohibidos
  en Stack Constraints. Razón en cada caso: redundancia respecto al stack
  ya elegido (Supabase typegen, Tailwind+Radix, RSC+URL state).
- **Governance simplificado**: aprobador único = el desarrollador en esta
  fase. Compliance review humana en cada PR. Versionado semver estricto.

**7 principios ratificados:**
I. Foco operativo — II. Simplicidad para no técnicos — III. Cero secretos
hardcodeados — IV. RLS obligatorio en Supabase — V. Privacidad por diseño
(Ley 25.326) — VI. Tests para lógica crítica — VII. Performance y mobile-first
medibles.

**Validación de templates dependientes:**
- `plan-template.md`: sin cambios (Constitution Check usa placeholder dinámico)
- `spec-template.md`: sin cambios (User Stories genéricas alineadas)
- `tasks-template.md`: sin cambios (estructura de fases alineada con principio VI)

**Commit message sugerido por la skill:**
`docs: ratify project constitution v1.0.0 (7 principles + stack constraints + governance)`

### Paso 14 — Commit inicial estructurado y push 🟢

**Fecha:** 2026-05-01 · **Commit:** `89af683` · **Branch:** `main`

**Decisión metodológica:** se descartó el auto-commit del skill
`/speckit-git-commit` para este caso específico porque:
- Era el commit inicial real (32 archivos heterogéneos de Fase 0)
- El mensaje genérico `[Spec Kit] Add project constitution` describiría
  solo 1 de 32 archivos
- Para los próximos comandos (`/speckit-specify`, `/speckit-plan`) sí
  tiene sentido el auto-commit porque el cambio será homogéneo

**Commit creado manualmente** con Conventional Commits siguiendo este formato:

```
chore: close Phase 0 — Spec Kit setup + constitution v1.0.0 + project briefing

(cuerpo descriptivo con cada componente del setup)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Verificación de seguridad antes del commit:** `git diff --cached --name-only`
filtrado por patrones de secretos (`\.env$|\.env\.local$|\.key$|\.pem$|...`).
Resultado: sin secretos detectados.

**Push:** `git push -u origin main` exitoso, branch trackea origin/main.

**Repo público:** https://github.com/saadypacheco/apops/commit/89af683

### Paso 14b — Refactor del modelo de datos por padrón real 🔵 *(decisión del proyecto, alto impacto)*

**Fecha:** 2026-05-01 · **Disparado por:** revisión humana del data-model
con padrón real del gremio en mano.

**Trigger**: durante el GATE post-`/speckit-plan`, el dev compartió una
imagen del padrón real (Excel "COTIZANTES DE JULIO 2016") con ~26 columnas.
Esto reveló dos cosas que el modelo previo no contemplaba:

1. **El padrón es de COTIZANTES** (todos los que cotizan a algún gremio),
   no de afiliados APOPS. La columna `APOPS = x` diferencia. Personas con
   `x` en otra columna (ATE/SEC/UPCN/SECASFPI) están en padrón pero NO son
   afiliadas APOPS.
2. **Los jubilados afiliados se identifican por la columna existente
   `cotiza_papel`** (cotizan por transferencia), no por un padrón separado.

**Decisiones tomadas:**
- Una sola tabla `padron_cotizantes` (no dos padrones separados).
- Solo dos tipos válidos de afiliado APOPS: `activo` y `jubilado`.
  `ex_empleado` se elimina del modelo.
- Personas en padrón sin flag APOPS ni cotiza_papel → `pendiente_validacion`
  con `motivo_pendiente='sin_flag_apops_y_sin_papel'`.
- El cliente NUNCA recibe a qué gremio cotiza la persona (privacidad — Ley
  25.326).

**Archivos afectados** (10 cambios coordinados):
`AGENTS.md` (§2 tipos, §5 flujo 2) · `spec.md` (clarifications, US1, US2,
FRs 002/004/007, Key Entities, Assumptions, Dependencies) · `data-model.md`
(reescritura completa) · `contracts/edge-validar-padron.json` (lógica con
motivos discriminados) · `contracts/edge-solicitar-magic-link.json`
(eliminado ex_empleado) · `plan.md` (1 línea) · `quickstart.md` (datos
de prueba + nuevo escenario 4b).

**Lección metodológica capital**: el GATE post-plan funcionó exactamente
como el PDF página 17 lo prescribe. Si hubiéramos saltado a
`/speckit-tasks` con el modelo previo, habríamos generado código contra
dos tablas inexistentes (`padron_activos` / `padron_no_activos`) y un tipo
de usuario (`ex_empleado`) que el negocio explícitamente no permite. La
revisión humana antes de implementar evitó **retrabajo significativo**.
Tu pregunta "¿este padrón define la tabla?" fue exactamente la pregunta
correcta en el momento correcto. **No saltearlo nunca.**

**Constitution check post-refactor**: ✅ los 7 principios siguen cumplidos.
Mejor cumplimiento del principio V (privacidad) porque el contrato ahora
distingue explícitamente entre "no en padrón" y "sin afiliación APOPS" sin
filtrar la afiliación real. Sin bump de versión de constitución.

---

### Paso 15 — Arranque del ciclo de feature

Fase 0 cerrada. Empieza F1: `/speckit-specify` con la primera feature del MVP.

**Decisión pendiente** antes de tipear `/speckit-specify`: ¿cuál es la primera
feature? Opciones evaluables:

| Candidata | Pro | Contra |
|---|---|---|
| Auth (registro + login) | Bloqueante para todo lo demás. Sin auth, ningún módulo funciona | No es el núcleo, no muestra valor visual rápido |
| Consultas (núcleo) | Es el corazón del producto. Mostrar consultas funcionando "vende" el producto a la CD | Requiere auth funcionando como prerequisito |
| Credencial digital con QR | Demo visual rápido y autocontenido | Tampoco es el núcleo |

**Recomendación pendiente de discutir** con el usuario en la próxima sesión.

---

### Paso 16 — Incidente Storage en Phase 2 (Foundational) 🔵 *(decisión del proyecto, workaround)*

**Fecha:** 2026-05-01 · **Contexto:** primera ejecución de `npx supabase start`
en el proyecto APOPS, durante Phase 2 de la feature `001-afiliado-auth`.

**Síntoma observado:**
- Las 8 migraciones (0009-0016) y `seed.sql` aplicaron limpio (logs lo confirman).
- Al final del arranque, el healthcheck de `supabase_storage_apops-siempre`
  falló con `container is not ready: unhealthy`.
- El CLI hizo rollback automático de TODOS los containers (comportamiento
  estándar de `supabase start`: si un componente falla, no deja el stack
  parcialmente arriba).

**Diagnóstico:** problema conocido del módulo Storage de Supabase corriendo
en Docker Desktop en Windows. Causas típicas: permisos del volumen,
antivirus interfiriendo con I/O, o conflictos de red. No es bug de las
migraciones ni del schema.

**Decisión:** deshabilitar `[storage] enabled = false` en
`supabase/config.toml` por ahora.

**Por qué es aceptable:**
- La feature `001-afiliado-auth` no usa Storage en absoluto. Auth, validación
  de padrón, audit log y RLS son todos a nivel DB + GoTrue + Edge Functions.
- Mantener Storage habilitado pero roto bloquea TODO el desarrollo local.
  Apagarlo desbloquea sin afectar funcionalidad de esta feature.
- Es un cambio reversible y aislado a un módulo.

**Alternativa rechazada:** debugar el container Storage ahora (revisar logs,
permisos del volumen, listas blancas del antivirus). Tomaba 15-30 min sin
desbloquear nada de Phase 2.

**Follow-up obligatorio:** cuando entre la feature de **credencial digital
con QR** (o cualquier otra que suba archivos), reactivar Storage y debugar
el healthcheck en ese momento. El comentario inline en `config.toml` deja
el recordatorio.

**Lección metodológica:** los workarounds locales son aceptables si
(a) están aislados y reversibles, (b) están documentados con su trigger de
re-evaluación, y (c) no afectan producción ni el contrato del feature
actual. SDD no prescribe esto explícitamente — es buena práctica
operacional de cualquier proyecto.

---

### Paso 17 — Cierre de feature 001-afiliado-auth (Phases 3-6) 🟢🔵

**Fecha:** 2026-05-01 → 2026-05-04
**Branch:** `001-afiliado-auth`
**Commits del ciclo:** Phases 2-6 (5 commits, sin contar Phase 1 que fue setup).

**Lo que se construyó (resumen):**

| Phase | User Story | Tareas | Estado |
|---|---|---|---|
| 3 (P1 — MVP) | US1: afiliado activo (DNI + legajo) | T033-T048 | ✅ |
| 4 (P1) | US2: jubilado sin legajo (solo DNI) | T049-T056 | ✅ |
| 5 (P2) | US3: pendiente_validacion + admin resolver | T057-T064 | ✅ |
| 6 (Polish) | logout, magic-link reenvío, tests, lighthouse, a11y, docs | T065-T078 | ✅ |

Resultado verificable: 4 Edge Functions (`validar-padron`, `solicitar-magic-link`, `resolver-pendiente`, `auth/callback`), 9 migraciones (0009-0017), 19 archivos de test, ~62 casos de test verdes, 12 páginas Next.js + middleware.

**Decisiones tomadas durante implementación que no están en PDF/spec:**

1. **Cookie HTTP-only `apops-auth-ctx`** (TTL 10 min) para mantener contexto entre pantallas del wizard de auth (DNI → email → magic link). Evita estado en URL (que filtraría datos al referrer) y evita Redux/Zustand para algo que es server-side. SDD sugiere "form steps" pero no prescribe el mecanismo de persistencia.

2. **Cookie `apops-recent-validation`** (TTL 4h, separada) para FR-017 (reenvío sin reingresar DNI/legajo). Trade-off documentado: incluye email para UX 1-tap; aceptado por ser HTTP-only + same-site + secure en prod.

3. **Migración stub `0017_roles_admin_stub.sql`** para destrabar tests del Edge Function `resolver-pendiente`. Tabla mínima documentada como reemplazable por la futura feature de roles. SDD no contempla "deferred dependencies" formalmente — usé el patrón ya empleado en `0009_padron_cotizantes_stub.sql`.

4. **Email custom vía SMTP/Mailpit** en lugar de `signInWithOtp` con template default de gotrue, por bug del CLI v2.98 con la URL del template (apunta a `/verify` sin `/auth/v1/`). Decisión inline en `solicitar-magic-link/index.ts`. En producción se sustituye por Resend/Sendgrid.

5. **Defense-in-depth en /(app)/layout.tsx**: gate de sesión server-side aunque el middleware ya redirige. Costo: una llamada extra a `auth.getUser()` por render. Beneficio: si el middleware no corriera, no se renderiza contenido autenticado.

6. **T072 (logout test) pragmático**: logoutAction es Server Action de Next.js → no testable directo en vitest sin mocking pesado. Se replicaron los efectos verificables (audit insert + signOut). El UI flow (redirect, cookie removida) queda para Playwright e2e en una iteración futura. SDD no prescribe esta línea de corte; la tomé documentándola en el comentario del archivo.

7. **Auditoría de a11y T074 dividida**: estática (manual sobre JSX) ✓ y dinámica (NVDA/VoiceOver + axe-core automático) deferida. Documentada en `docs/a11y-audit.md`. Justificación: la pasada con lector de pantalla la tiene que hacer Saady; axe-core requiere tests Playwright que no están todavía.

**Lecciones metodológicas:**

- **Spec viva** ≠ spec congelada. Vimos varias veces cómo durante implementación aparecen detalles que el spec no anticipó (ej. el bug del template de gotrue, el edge runtime que cachea funciones al arrancar). El patrón que funcionó: documentar la decisión inline en el código + referenciar acá. No re-abrir el spec por cada uno.

- **Tests serializados** (`fileParallelism: false` en vitest.config.ts) costaron ~2× tiempo pero eliminaron flakiness por compartir DNIs del seed. Vale el costo.

- **Stub-first para deferred dependencies** (padron_cotizantes en 0009, roles_admin en 0017) destraba el desarrollo sin esperar features upstream. SDD no lo nombra explícitamente; merece una sección en metodología propia.

- **Reusar pattern entre Edge Functions** (mismo SMTP, mismo audit helper, misma cabecera CORS) ahorró trabajo y bugs. El comentario en `_shared/audit.ts` lo formaliza.

**Lo que queda fuera de esta feature** (follow-ups documentados):

- Feature de roles real (reemplaza `0017_roles_admin_stub.sql`).
- Panel admin para resolver pendientes (la API está; falta la UI).
- Tests Playwright e2e de los flujos completos + axe-core integration.
- Pasada NVDA/VoiceOver real.
- Reactivar Storage cuando entre feature con archivos.

**Métricas finales:**

- Bundle First Load JS: 87-99 kB (debajo del benchmark Next.js ~120 kB).
- Tests: 62 verde, 0 rojo.
- Lighthouse: thresholds 90/85/90 verificables en CI (treosh action).
- Cobertura de eventos audit_log: 12 eventos del CHECK constraint cubiertos por al menos un test.

---

## Decisiones tomadas que no están en el PDF (revisar al final)

Lista para validar al cierre del proyecto contra documentación oficial de Spec
Kit y comunidad.

1. `pip install --user uv` (vs `pip install uv` global) — Paso 3
2. Persistir paths Windows en User PATH — Paso 4
3. `.gitignore` con bloques específicos para Web Push, Supabase, Vercel — Paso 7
4. `.env.example` como plantilla pública — Paso 8
5. Renombrar `master` → `main` antes del push inicial — Paso 9
6. Estructura de `AGENTS.md` v2 (11 secciones) — Paso 10
7. Esta bitácora misma — Paso 10 (decisión meta)

Cada una de estas decisiones podría ser "lo que la comunidad ya hace por default
en 2026" o "una elección personal". Validar al cierre.

---

## Cómo se actualiza esta bitácora

- Antes de ejecutar un paso nuevo, agregar la entrada con marcador 🟢🟡🔵.
- Si una decisión cambia (como pasó con §6 de AGENTS.md), no borrar — agregar
  "Decisión revertida" para que quede el rastro.
- La sección "Lo que viene" se vacía conforme avanza el proyecto: lo terminado
  pasa a la sección de pasos ejecutados.
