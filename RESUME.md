# Retomar trabajo — APOPS Siempre

> Doc de handoff entre sesiones. Última actualización: 2026-05-04.
> Branch activa: `001-afiliado-auth`. PR #1 abierto a `main`.

## Estado al cerrar la sesión

**Lo que funciona end-to-end** (probable en `http://localhost:3000`):

- **Landing** (`/`): gradient navy → azul medio, logo APOPS oficial, carousel de noticias, form de login (DNI + legajo), botón flotante de ayuda con WhatsApp/Email/Tel, footer minimalista con contacto, link "Afiliate ahora".
- **Auth completo** (`/login` redirige a `/`, `/login-sin-legajo`, `/email`, `/nombre-completo`, `/magic-link-enviado`, `/magic-link-expirado`, `/pendiente-validacion`).
- **Post-login con ruteo por rol** (`/feed`, `/admin`, `/delegados`, `/perfil`).
- **Afiliación pública** (`/afiliarse`): wizard de 3 pasos con StepIndicator visual, validación per-step, firma digital con canvas pad. Guarda en DB tabla `solicitudes_afiliacion`. Termina en `/afiliarse/exito`.

**Datos de prueba disponibles (seed)**:
- DNI 30000001 + L-0001 → activo APOPS
- DNI 20000001 (sin legajo) → jubilado APOPS
- DNI 99999999 + L-9999 → no en padrón (queda como pendiente)
- 4 noticias del seed visibles en landing y `/feed`

**Tests**: 62/62 verde a commit anterior. Tests de la afiliación nueva NO escritos.

## Lo que falta de la afiliación

Lo dejé en estado WIP funcional. La firma se captura y guarda en DB, pero **no se genera PDF ni se mandan emails**. Próxima sesión retomamos los pasos B y C que estaban en agenda:

### Paso B — Generación PDF server-side

**Lib propuesta**: `pdf-lib` (~250 KB, sin dependencias nativas, corre en Node y Edge).

Instalar:
```bash
npm install pdf-lib
```

Crear: `src/lib/afiliacion/generate-pdf.ts`

Función esperada:
```ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function generateAfiliacionPDF(solicitud: SolicitudRow): Promise<Uint8Array> {
  // 1. PDFDocument.create()
  // 2. addPage A4 (595 x 842)
  // 3. Embed font (StandardFonts.Helvetica + Helvetica-Bold)
  // 4. Drawing: header con título "FICHA DE AFILIACIÓN", logo (opcional, embed PNG), datos por sección
  // 5. Embed firma_png como image (data URL → base64 → embedPng)
  // 6. return pdfDoc.save()
}
```

Layout sugerido (A4 vertical):
- Header: "FICHA DE AFILIACIÓN APOPS" centrado + fecha
- Sección Datos Personales: tabla con apellido, doc, fecha nac, estado civil
- Sección Domicilio
- Sección Contacto (tel, cel, email, CBU)
- Sección Lugar de Trabajo (legajo, edificio, gerencia, área, planta)
- Sección Familia: cónyuge si hay, lista de familiares
- Sección Consentimiento: texto del 3% + tilde "✓ Aceptado"
- Sección Firma: imagen del PNG con label "Firma del solicitante" debajo
- Footer: "Solicitud #abc123, generada el ..."

**Endpoint de descarga** para que el admin/usuario lo baje:
- Route handler `src/app/(auth)/afiliarse/[id]/pdf/route.ts` que retorna el PDF con `Content-Type: application/pdf`.
- En `/afiliarse/exito`, agregar botón "Descargar mi ficha (PDF)" linkeando a esa ruta.

### Paso C — Email PDF + WhatsApp

**Email** (server-side desde Server Action):
- Usar `nodemailer` (Node, NO deno mailer del Edge Function porque la action corre en Node).
- Reusar las variables de env `APP_SMTP_HOST/PORT/FROM` que ya existen en `supabase/config.toml` y `.env.local`.
- Envío de 2 mails por solicitud:
  1. Al afiliado (`solicitud.email`): asunto "Recibimos tu solicitud", PDF adjunto, mensaje de bienvenida, próximos pasos
  2. Al gremio (`apops@apops.org.ar`): asunto "Nueva afiliación: {nombre} ({DNI})", PDF adjunto

Instalar:
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

Crear: `src/lib/afiliacion/send-emails.ts`

```ts
import nodemailer from 'nodemailer'

export async function sendAfiliacionEmails(args: {
  pdfBytes: Uint8Array
  emailAfiliado: string
  nombreAfiliado: string
  dni: string
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.APP_SMTP_HOST ?? '127.0.0.1',
    port: Number(process.env.APP_SMTP_PORT ?? 1025),
    secure: false,
  })
  
  const attachment = {
    filename: `ficha-afiliacion-${args.dni}.pdf`,
    content: Buffer.from(args.pdfBytes),
    contentType: 'application/pdf',
  }
  
  // 2 sends en paralelo: afiliado + gremio
  await Promise.all([
    transporter.sendMail({
      from: process.env.APP_SMTP_FROM ?? 'no-reply@apops.local',
      to: args.emailAfiliado,
      subject: 'Recibimos tu solicitud de afiliación',
      html: '...mensaje al afiliado...',
      attachments: [attachment],
    }),
    transporter.sendMail({
      from: process.env.APP_SMTP_FROM ?? 'no-reply@apops.local',
      to: 'apops@apops.org.ar',
      subject: `Nueva afiliación: ${args.nombreAfiliado} (DNI ${args.dni})`,
      html: '...mensaje al gremio...',
      attachments: [attachment],
    }),
  ])
}
```

**Wirear en submitAfiliacion**: después del INSERT exitoso, generar PDF y mandar emails. NO bloquear la response — los emails pueden tardar. Opciones:
- Síncrono (más simple, response tarda 2-5s extra)
- Background con `after()` de Next.js 14 (`unstable_after`) — más complejo pero mejor UX

**WhatsApp link en `/afiliarse/exito`**:
- Agregar botón verde estilo WhatsApp:
  ```tsx
  <a href={`https://wa.me/5491155448300?text=${encodeURIComponent(`Hola, soy ${nombre} (DNI ${dni}) y acabo de enviar mi solicitud de afiliación. ¿Podemos confirmar?`)}`}>
    Avisarle al gremio por WhatsApp
  </a>
  ```
- Para que el botón tenga los datos, la página de éxito tiene que recibir nombre+DNI vía searchParams (hoy solo tiene `id`). Cambiar `redirect(`/afiliarse/exito?id=${id}&nombre=${nombre}&dni=${dni}`)` en submitAfiliacion.

### Validar los emails localmente

Mailpit corre en `http://localhost:54324`. Después de probar el form, los 2 emails caen ahí — abrís Mailpit y los ves.

## Cómo arrancar la próxima sesión

```bash
# 1. Posicionarse
cd c:/repos/proyectosClaude/apops

# 2. Verificar branch
git status              # debe ser 001-afiliado-auth, working tree clean
git log -3 --oneline    # último commit: e33cb9e (afiliación + UX landing)

# 3. Levantar Supabase (si no está corriendo)
npx supabase status     # ver si está up
npx supabase start      # si no, arrancar

# 4. Levantar Next.js
npm run dev             # http://localhost:3000

# 5. Empezar paso B
npm install pdf-lib
# después seguir con el plan de "Paso B" arriba
```

## Estado del PR y commits

```
e33cb9e  feat: afiliación online (wizard 3 pasos + firma) + UX landing  ← ÚLTIMO (no pusheado)
56ff17b  feat: landing con noticias + login + ruteo por rol             ← no pusheado
cd889b7  feat(auth): Phase 6 — cierre (T070-T078)                       ← pusheado
405162b  feat(auth): Phase 6 — logout y magic-link reenvío (T065-T069)  ← pusheado
5485e7f  feat(auth): Phase 5 — US3 pendiente_validacion (T057-T064)     ← pusheado
...
```

**PR #1** (a `main`): https://github.com/saadypacheco/apops/pull/1 — abierto. Los 2 commits locales nuevos (`56ff17b`, `e33cb9e`) **NO están pusheados todavía**. La próxima sesión, decidir si:
- Pushearlos al PR existente (queda como un solo PR grande con feature 001 + landing nueva + afiliación)
- O abrir un PR nuevo desde una branch limpia para la afiliación (más prolijo metodológicamente, pero más laburo)

## Notas operacionales

- **Logo**: `public/logo-apops.png` (PNG con fondo cyan cuadrado). El componente `Logo.tsx` lo rounded-full + overflow-hidden. Si conseguís un PNG transparente, reemplazás el archivo.
- **Email del gremio para envío**: usé `apops@apops.org.ar` cabe directamente en el código de `send-emails.ts` cuando lo escribas. Si en el futuro hay otro email exclusivo para afiliaciones, ajustar.
- **WhatsApp del gremio**: usé `+5491155448300` (su tel oficial). Si tienen un WA específico para afiliaciones, cambiar en la página de éxito y en el HelpButton.
- **Routine de seguimiento del PR #1**: programada para 2026-05-09 (https://claude.ai/code/routines/trig_01SDVgh3DH1c8Tv6U4FqgSxt).

## Cosas que no se hicieron y vale anotar

- Tests automatizados de la afiliación nueva (form + server action + DB).
- Panel admin para listar/procesar `solicitudes_afiliacion` (la API está, falta UI).
- Captcha o rate limit en `/afiliarse` (la ruta es pública anon, alguien podría spammear).
- Pasada manual de a11y con NVDA (T074 de Phase 6 sigue pendiente).
- Tests Playwright e2e (test:e2e corre vacío).
