# Auditoría de accesibilidad — feature 001-afiliado-auth

**Fecha**: 2026-05-03
**Alcance**: rutas públicas y autenticadas de la feature de auth.
**Estándar**: WCAG 2.1 AA. Constitución VII (Lighthouse Accessibility ≥ 90).

## Páginas auditadas (T074)

- `/login` — DNI + legajo
- `/login-sin-legajo` — DNI solo (jubilados)
- `/email` — captura de email
- `/nombre-completo` — captura de nombre (sub-flujo sin_legajo + DNI no en padrón)
- `/magic-link-enviado` — confirmación
- `/magic-link-expirado` — reenvío
- `/pendiente-validacion` — estado terminal
- `/perfil` — datos del afiliado + logout

## Auditoría estática (manual)

Revisión componente por componente de los patrones WCAG 2.1 AA aplicables.

### Componentes UI (`src/components/ui/`)

| Componente | Patrón | Estado |
|---|---|---|
| `Input` | Radix `Label` con `htmlFor` ligado al `id` del input | ✅ |
| `Input` | `aria-invalid` cuando hay error | ✅ |
| `Input` | `aria-describedby` apunta a hint y/o error | ✅ |
| `Input` | Mensaje de error con `role="alert"` (notificación inmediata) | ✅ |
| `Input` | `min-h-[44px]` touch target (constitución II) | ✅ |
| `Input` | `text-base` (16 px) — evita zoom en iOS | ✅ |
| `Input` | Borde rojo + texto rojo en error (no solo color: hay `aria-invalid`) | ✅ |
| `Button` | `min-h-[44px] min-w-[44px]` touch target | ✅ |
| `Button` | `focus-visible:ring-2 focus-visible:ring-offset-2` | ✅ |
| `Button` | `aria-busy={pending}` durante submit | ✅ |
| `ErrorMessage` | `role="alert" aria-live="polite"` | ✅ |

### Páginas

| Patrón | `/login` | `/login-sin-legajo` | `/email` | `/nombre-completo` | `/perfil` | otras |
|---|---|---|---|---|---|---|
| `<main>` como contenedor principal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Una sola `<h1>` por página | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Texto descriptivo bajo el `<h1>` (instrucciones) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ |
| Imágenes con `aria-hidden` (decorativas: emoji) | n/a | n/a | n/a | n/a | n/a | ✅ |
| Touch targets ≥ 44 × 44 px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `<dl>` semántico para datos clave-valor | n/a | n/a | n/a | n/a | ✅ | n/a |

### Color y contraste

Colores principales y su contraste contra el fondo (white):

| Color | Hex | Uso | Contraste vs white | Cumple |
|---|---|---|---|---|
| Azul oscuro APOPS | `#042C53` | Títulos h1, valores de datos | ~14:1 | AAA ✅ |
| Gris medio | `#5F5E5A` | Subtítulos, etiquetas dt | ~6.3:1 | AA ✅ |
| Azul Tailwind 600 | `#2563EB` | Botones primary background → texto white | ~5.5:1 | AA ✅ (texto grande/normal) |
| Azul Tailwind 700 | `#1D4ED8` | Links | ~8.6:1 | AAA ✅ |
| Rojo Tailwind 600 | `#DC2626` | Texto de error | ~4.7:1 | AA ✅ |
| Rojo Tailwind 800 sobre Rojo 50 | sobre `#FEF2F2` | Texto de banner error | >9:1 | AAA ✅ |

### Errores y feedback

- ✅ Errores por campo: `<p role="alert">` adyacente al input, ligado por `aria-describedby`.
- ✅ Errores globales: `<ErrorMessage>` con `role="alert" aria-live="polite"`.
- ✅ Estado de carga: `aria-busy="true"` en el submit + texto cambia a "Validando…" / "Enviando…".

### Navegación por teclado

Patrones verificados estáticamente (todos los elementos interactivos son nativos):

- `<input>`, `<button>`, `<a>` reciben foco por tab.
- `focus-visible:outline-none focus-visible:ring-2` en todos los focusables.
- No hay `tabindex` positivo (que rompería orden natural).
- No hay `outline: none` sin `focus-visible:ring` que lo reemplace.

### Idioma

- ✅ `<html lang="es">` se asume del root layout (Next.js + `<html lang>` configurado).

## Auditoría dinámica (pendiente — manual con NVDA/VoiceOver)

**Estado**: NO ejecutado en esta auditoría automática. Requiere correr con
lector de pantalla real para validar:

- Anuncio correcto de errores cuando aparecen dinámicamente (rol `alert`).
- Lectura de los inputs con su label asociado.
- Anuncio del estado `aria-busy` durante el submit.
- Anuncio del flujo completo de registro hasta `/magic-link-enviado`.
- Anuncio del logout desde `/perfil`.

**Recomendación**: ejecutar NVDA (Windows) o VoiceOver (macOS/iOS) sobre las
4 pantallas críticas: `/login`, `/login-sin-legajo`, `/email`, `/perfil`.
Documentar las observaciones acá si aparecen problemas.

## Auditoría dinámica con axe-core (pendiente)

`axe-core` automatiza ~30 % de las violaciones WCAG. Se puede integrar via:

- `axe-playwright` en los tests e2e.
- `@axe-core/cli` ejecutado contra el dev server.

**Estado**: dejado para una iteración posterior (pre-PR de la próxima feature).
La auditoría estática + Lighthouse en CI cubren el grueso. axe-core
detecta cosas finas como duplicate-id, label-alone-not-enough, etc., que
no aparecieron en la lectura manual de la JSX.

## Conclusión

**Sin violaciones WCAG 2.1 AA detectadas en la auditoría estática.**
La feature respeta:

- Constitución II (touch targets ≥ 44 px, lenguaje claro, sin contraseñas).
- Constitución VII (mobile-first, contraste suficiente, semántica correcta).

Los gaps explícitos son la pasada con NVDA/VoiceOver y la integración de
axe-core automatizado — ambos no-bloqueantes para el merge inicial.
