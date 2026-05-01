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

### Paso 14 — Commit inicial 🟢

```
chore: inicializar Spec Kit y estructura del proyecto
```

Incluye: `.specify/`, `.claude/skills/`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`,
`.env.example`, `docs/metodologia.md`, `docs/bitacora-sdd.md`,
`.specify/memory/constitution.md`.

### Paso 15 — Push y arranque del ciclo de feature

```bash
git push -u origin main
```

Recién acá empieza F1: `/speckit-specify` con la primera feature
(feed del afiliado).

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
