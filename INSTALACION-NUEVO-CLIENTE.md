# Instalación para nuevo cliente — APOPS Siempre

> Playbook completo para clonar el sistema a un servidor + proyecto
> Supabase nuevos del cliente, desconectado de la demo de desarrollo.
> Pensado para entregar como producto operativo, no como demo.

---

## TL;DR

Tenés que:
1. Crear cuentas técnicas en nombre del cliente (Vercel, Supabase, Resend, dominio).
2. Clonar el repo a la organización del cliente.
3. Crear un nuevo proyecto Supabase + aplicar 36 migrations.
4. Cargar el padrón real del cliente y crear cuentas iniciales reales.
5. Configurar env vars en Vercel apuntando al nuevo Supabase.
6. Verificar dominio + push real + email transaccional.
7. Pre-flight checklist antes del go-live.

Tiempo estimado: **2-3 días de trabajo** si el cliente colabora con las decisiones a tiempo. El bottleneck siempre es esperar verificación DNS y aprobaciones del cliente, no el código.

---

## 1. Decisiones que el cliente tiene que tomar (pedir antes)

Estas decisiones bloquean el rollout. Conviene tenerlas resueltas antes de arrancar la instalación técnica.

| Decisión | Opciones | Recomendación |
|---|---|---|
| **Dominio** | apops.org.ar (subdominio app.apops.org.ar) / apops.app / mantener apops.vercel.app | Subdominio del dominio institucional del gremio. Da seriedad y SEO. |
| **Quién es admin inicial** | Una persona o varias | Mínimo 2 (Secretario General + otro miembro de CD) para no quedar sin acceso si uno se va. |
| **Cuenta GitHub para el código** | Propia del gremio o personal | **Propia del gremio** (`apops-org`). El código no es del dev, es del cliente. |
| **Cuenta Vercel** | Hobby (gratis) o Pro (USD 20/mes) | Hobby alcanza al principio. Subir a Pro cuando el tráfico lo justifique (>100k visits/mes). |
| **Cuenta Supabase** | Free / Pro (USD 25/mes) | Free alcanza para empezar con 15k cotizantes. Subir cuando llegue a 50k filas en tablas pesadas o se necesite backup automático. |
| **Cuenta Resend** | Free (3k mails/mes) / Pro (USD 20/mes) | Free alcanza si las afiliaciones son ~10/día. Subir si crece. |
| **Backups** | Quién hace, cuándo | Definir política de backup desde el día uno. Free plan de Supabase no hace backup automático. |

---

## 2. Cuentas y servicios a crear

Crear todo a nombre del cliente, no del dev. El dev queda como colaborador con acceso técnico, pero la propiedad legal de los recursos es del gremio.

### 2.1 GitHub Organization
- Crear org `apops-org` (o el nombre que prefieran).
- Crear repo privado `apops-siempre` en la org.
- Agregar al dev como **collaborator** (no owner).
- Migrar el contenido del repo actual (`saadypacheco/apops`) al nuevo repo.

### 2.2 Vercel
- Crear cuenta del gremio.
- Conectar con la GitHub org del cliente.
- Importar el repo `apops-org/apops-siempre`.
- Configurar las env vars (sección 5).

### 2.3 Supabase
- Crear proyecto nuevo: nombre `apops-prod`, región **South America (São Paulo)** (latencia mínima).
- **Importante**: anotar el `project_ref` (formato `aaaa-bbbb-cccc-dddd`) que va en la URL `https://<ref>.supabase.co`.
- Guardar las claves: `anon`, `service_role`. **Las dos son secretas para el cliente** (la anon se ve en frontend pero el cliente debe controlar quién la rota).

### 2.4 Resend
- Crear cuenta con email del gremio.
- Verificar dominio `apops.org.ar` agregando los registros DNS que Resend indica (TXT + DKIM + opcionalmente DMARC).
- **Esto puede demorar 24-48h** según el proveedor DNS — empezar el trámite el primer día.
- Generar API key (formato `re_xxx`).

### 2.5 DNS Provider
- Donde sea que esté `apops.org.ar` (NIC.ar, Cloudflare, GoDaddy).
- Necesitás acceso para:
  - Subdominio nuevo: `CNAME app.apops.org.ar → cname.vercel-dns.com`
  - Verificación Resend: TXT + DKIM
  - Verificación Vercel del subdominio.

---

## 3. Setup del repositorio

```bash
# 1. Clonar el repo de demo (saady) localmente
git clone https://github.com/saadypacheco/apops.git apops-prod
cd apops-prod

# 2. Cambiar el remote al repo del cliente
git remote set-url origin https://github.com/apops-org/apops-siempre.git

# 3. Subir todo al repo del cliente (incluye historial)
git push -u origin main

# 4. (Opcional) Limpiar archivos que son de demo y no van a prod
# - Propuesta-APOPS-Siempre.docx       → del dev, no del prod
# - Presentacion-APOPS-Siempre.pptx    → del dev, no del prod
# - scripts/seed-demo-*.ts             → seeds de demo
# - scripts/asignar-delegados-demo.ts  → asignaciones de demo
# - scripts/reset-demo-passwords.ts    → solo para devs
# - scripts/check-demo-accounts.ts     → solo para devs
# - scripts/debug-insert.ts            → diagnóstico, borrar si no se usa
# - scripts/inspect-policies.ts        → idem
# Estos archivos pueden quedar en el repo pero NO se corren en producción.
```

---

## 4. Setup de Supabase

### 4.1 Conectar el CLI al proyecto nuevo

```bash
# Login (una vez)
npx supabase login

# Link al proyecto del cliente
npx supabase link --project-ref <project_ref_del_cliente>
```

### 4.2 Aplicar todas las migrations

```bash
# Esto aplica 0001..0036 en orden contra el cloud del cliente.
npx supabase db push --linked
```

Si algo falla, revisar el error (suele ser conflictos de seed o de tipos `auth.users`). Las migrations son idempotentes (`CREATE IF NOT EXISTS` donde aplica) pero los seeds NO.

### 4.3 Cosas a revisar manualmente en Supabase Dashboard

| Sección | Qué configurar |
|---|---|
| **Authentication → Providers** | Email habilitado. Si querés magic links: activar email confirmations. |
| **Authentication → Email templates** | Personalizar con el branding del gremio (logo + colores). |
| **Authentication → Rate limits** | Subir el límite de signups si esperás muchas afiliaciones simultáneas. |
| **Project Settings → API** | Anotar URL + anon key + service role key para Vercel. |
| **Settings → Auth → URL Configuration** | Site URL: `https://app.apops.org.ar`. Redirect URLs: agregar las del wizard. |
| **Database → Tables** | Verificar que las 35+ tablas se crearon OK. |
| **Database → Policies** | Verificar que las policies de RLS están aplicadas (~30 policies). |

### 4.4 Datos iniciales (qué SÍ cargar, qué NO cargar)

**Cargar (datos reales del cliente)**:
- ✅ Padrón ANSES inicial (Excel del Ministerio del mes corriente).
- ✅ Adherentes (Excel de familiares si lo tienen).
- ✅ Cuentas de admin reales de la CD.
- ✅ Cuentas de delegados reales (con sus emails reales).
- ✅ Noticias iniciales que el cliente quiera que aparezcan al lanzar.

**NO cargar (es solo de la demo de desarrollo)**:
- ❌ Cuentas demo: `siempreapops`, `delegado.norte`, `delegado.sur`.
- ❌ Hilos demo de notificaciones (anteojos, vacaciones, asamblea — son ficticios).
- ❌ Snapshots sintéticos del padrón (abril/mayo/junio 2016 derivados).
- ❌ Asignaciones demo de delegados (`scripts/asignar-delegados-demo.ts`).

### 4.5 Crear cuentas iniciales

Para cada admin/delegado real:

1. **Crear el usuario en Supabase Auth** desde el Dashboard → Authentication → Add user (manual signup).
2. **Insertar fila en `afiliados`** con su DNI, nombre completo, email, rol (`admin` o `delegado`), `auth_user_id` = el id del usuario auth.
3. **Confirmar el email** si la configuración requiere (en Auth → Users marcar como confirmado).
4. Mandarle un mail al usuario diciendo: "Tu cuenta está creada. Entrá a app.apops.org.ar, hacé click en '¿Olvidé mi clave?' y poné una clave que recuerdes."

Alternativa más limpia: crear un script `scripts/seed-cuentas-iniciales.ts` que reciba un CSV/JSON con `(dni, nombre, email, rol)` y haga todo el flujo.

---

## 5. Variables de entorno en Vercel

### 5.1 Lista completa

| Variable | Dónde sacarla | Sensibilidad |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | Pública (va al cliente) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public | Pública (va al cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role | **SECRETA** — bypasea RLS, nunca exponer |
| `NEXT_PUBLIC_APP_URL` | URL del deploy | Pública |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Generar con `npx web-push generate-vapid-keys` | Pública |
| `VAPID_PRIVATE_KEY` | Generar con el mismo comando | **SECRETA** |
| `VAPID_SUBJECT` | `mailto:apops@apops.org.ar` | Pública |
| `RESEND_API_KEY` | Resend Dashboard → API Keys | **SECRETA** |
| `EMAIL_FROM` | Algo como `APOPS Siempre <noreply@apops.org.ar>` | Pública |

### 5.2 Aplicar en Vercel

Vercel Dashboard → Settings → Environment Variables.

Cada variable debe estar marcada en **Production + Preview + Development** (los 3 environments).

### 5.3 Generar las VAPID keys

```bash
npx web-push generate-vapid-keys
```

Sale algo como:
```
Public Key:
BHnFm...
Private Key:
xKjLP...
```

Cargarlas en Vercel **con el formato correcto** (key=value, sin las palabras "Public Key:" / "Private Key:" pegadas como texto — ese fue un bug que rompió Saady).

---

## 6. Configurar dominio personalizado

### 6.1 En Vercel
- Settings → Domains → Add Domain → `app.apops.org.ar`
- Vercel te dice qué registro DNS configurar (típicamente CNAME).

### 6.2 En el DNS provider del cliente
- Agregar registro `CNAME app → cname.vercel-dns.com`
- TTL: 3600 (1h) está bien.

### 6.3 Esperar propagación
- Puede tardar de minutos a 24h según el provider.
- Vercel detecta automáticamente cuando está OK y emite el cert SSL.

### 6.4 Actualizar `NEXT_PUBLIC_APP_URL`
- Cambiar de `https://apops.vercel.app` a `https://app.apops.org.ar`.
- Redeploy.

---

## 7. Configurar Resend (email transaccional)

### 7.1 Verificar dominio
- Resend Dashboard → Domains → Add → `apops.org.ar`.
- Te muestra unos 3-4 registros TXT/DKIM/DMARC.
- Pegarlos en el DNS provider del cliente.
- Verificar (botón "Verify" en Resend).
- Puede tardar 24-48h según el provider.

### 7.2 Crear API key
- Resend Dashboard → API Keys → Create API Key.
- Nombre: "Production".
- Permission: "Sending access".
- Cargar la key (`re_xxx`) en Vercel como `RESEND_API_KEY`.

### 7.3 Probar
- Una vez deployado con la key configurada, enviar una afiliación de prueba desde `/afiliarse`.
- Debería llegar el PDF al aspirante, a `apops@apops.org.ar` y al delegado del edificio (si lo declaró).

---

## 8. Lo que falta implementar antes del rollout

### 8.1 Crítico (sin esto no se puede mostrar a usuarios reales)

| Pendiente | Estado | Quién | Esfuerzo |
|---|---|---|---|
| **Push reales con VAPID** | Código deployado. Falta cargar 3 env vars. | Dev | 10 min |
| **Mail con PDF (Resend)** | Código deployado. Falta cuenta + dominio + 2 env vars. | Dev + cliente | 1 día (DNS) |
| **INSERT anon en `solicitudes_afiliacion`** | Test RLS skipped — RLS devuelve 401 aunque la policy esté correcta. **El form en prod funciona porque el server action usa service_role**, pero conviene investigar y arreglar. | Dev | 1-2h |
| **Cuentas iniciales reales** | Solo demo. Hay que crear las del cliente. | Cliente + dev | 1-2h |
| **Padrón real** | Hay un excel demo. Hay que cargar el del mes actual. | Cliente | 30 min |

### 8.2 Importante (mejora calidad para el rollout)

| Pendiente | Por qué importa | Esfuerzo |
|---|---|---|
| **Rol "Publicador de noticias"** | Permite a la CD delegar comunicación sin dar acceso al padrón. | 1 sesión |
| **Rol "Delegado regional"** | Para gremios con regiones formales. | 1-2 sesiones |
| **Sistema de encuestas** (interrumpido en sesión 2026-05-28) | Feature solicitada para medir clima. Diseño hecho, falta implementar. | 1-2 sesiones |
| **Tests E2E con Playwright** | Cobertura completa del flujo afiliado/delegado/admin. | 1 sesión |
| **Tracking por pantalla** (qué mira cada perfil) | Para mejorar contenido y priorizar features. | 1-2 sesiones |

### 8.3 Nice-to-have (post-rollout)

- Autogestión de adherentes (titular agrega/edita familiares desde la app).
- Cumplimiento de protección de datos (políticas de retención + consentimiento explícito).
- Cartilla médica con búsqueda y geolocalización.
- Acceso integrado a beneficios, descuentos y turismo.
- Solicitud y administración de turnos.

---

## 9. Pre-flight checklist (antes del go-live)

Marcar todo OK antes de mandar el email masivo a los afiliados.

### Build y deploy
- [ ] Build de Vercel pasa verde con env vars de producción.
- [ ] `npm run build` local pasa contra el cloud del cliente.
- [ ] `npx tsc --noEmit` verde.
- [ ] Suite RLS pasa contra el cloud del cliente (`npx vitest run tests/rls/seguridad.test.ts` con `.env.cloud` del nuevo proyecto).

### Configuración
- [ ] Dominio `app.apops.org.ar` resuelve a Vercel con SSL OK.
- [ ] `/api/health` responde 200 en el dominio nuevo.
- [ ] VAPID keys en Vercel (las 3 vars).
- [ ] Resend domain verificado.
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` en Vercel.
- [ ] `NEXT_PUBLIC_APP_URL` apunta al dominio del cliente.

### Datos
- [ ] Padrón ANSES real cargado del mes corriente.
- [ ] Adherentes cargados (si los hay).
- [ ] Cuentas admin reales creadas (mínimo 2).
- [ ] Cuentas delegados reales creadas con sus emails reales.
- [ ] Al menos 1 noticia inicial publicada como "destacada".

### Funcional (probado en el nuevo entorno)
- [ ] Login con cuenta admin real funciona.
- [ ] Dashboard CD muestra padrón cargado correctamente.
- [ ] Login con cuenta delegado real funciona y ve su edificio.
- [ ] `/afiliarse` envía OK + el PDF llega por mail.
- [ ] Push real al celular llega (instalar PWA y probar).

### Branding
- [ ] Logo y colores correctos (revisar `/public/imagenes/` y `src/components/landing/Logo.tsx`).
- [ ] Copy revisado: no quedan referencias a "demo", "Saady", o cuentas test.
- [ ] Página `/software` actualizada con info real del gremio.
- [ ] Noticias demo eliminadas.

### Backup
- [ ] Backup inicial del Supabase tomado (manual desde Dashboard → Database → Backups).
- [ ] Política de backup acordada con el cliente.

---

## 10. Comunicación del rollout

### 10.1 Pre-lanzamiento (1 semana antes)

- Mail interno a la CD avisando fecha de go-live.
- Reunión con delegados para que sepan que el sistema viene.
- Capacitación de 30 min a admins (cómo gestionar novedades, dashboard, procesar afiliaciones).

### 10.2 Lanzamiento

- Mail masivo a todos los cotizantes ANSES con email registrado, anunciando la app.
- Asunto sugerido: "Bienvenido a APOPS Siempre — tu gremio en el bolsillo".
- Link al landing público + tutorial corto de instalación.

### 10.3 Post-lanzamiento (primera semana)

- Mirar tab "Uso" diariamente para detectar problemas.
- Mantener canal directo dev ↔ cliente para fixes rápidos.
- Anotar feedback de usuarios reales para priorizar el siguiente sprint.

---

## 11. Costos estimados de operación (USD/mes)

Para que el cliente sepa qué presupuesto necesita:

| Servicio | Plan inicial | Costo USD/mes | Cuándo subir |
|---|---|---|---|
| **Vercel** | Hobby | 0 | >100k visits/mes o necesidad de SSO |
| **Supabase** | Free | 0 | >500MB DB o necesidad de backup automático |
| **Resend** | Free | 0 | >3k mails/mes |
| **GitHub** | Free | 0 | Equipo >5 collaborators |
| **Dominio** | Renovación anual | ~10 USD/año | — |
| **Total estimado** | — | **~1 USD/mes** | — |

Cuando crezca el uso:

| Servicio | Plan siguiente | Costo USD/mes |
|---|---|---|
| Vercel Pro | $20 | Cuando hay equipo con varios devs |
| Supabase Pro | $25 | Cuando se necesita backup diario + más DB |
| Resend Pro | $20 | Si superan 3k mails/mes |
| **Total escalado** | — | **~65 USD/mes** |

Comparado con un desarrollo nativo (Android + iOS + backend tradicional) que cuesta USD 30k+ de inicio + USD 1000+/mes de mantenimiento, esto es marginal.

---

## 12. Próxima sesión de Claude Code

La próxima sesión debería arrancar atacando estos pendientes en orden:

1. **Revisar este documento** y validar que el cliente esté listo con sus decisiones.
2. **Setup del repo + Supabase nuevo** (si el cliente ya creó las cuentas).
3. **Migration de datos**: padrón real + cuentas iniciales.
4. **Configurar VAPID + Resend** en el nuevo entorno.
5. **Suite RLS contra el nuevo cloud** para validar seguridad.
6. **Implementar sistema de encuestas** que quedó pendiente.
7. **Implementar rol "Publicador de noticias"**.

Cuando arranques la próxima sesión, mencioná esto en el primer mensaje:

> "Sesión nueva para arrancar el rollout al cliente. Leé INSTALACION-NUEVO-CLIENTE.md
> y RESUME.md, después decime por dónde arrancamos según lo que tenga
> resuelto el cliente."

El bootstrap automático del agente (CLAUDE.md) va a leer esos archivos y va a pedirte el estado actualizado del cliente para priorizar.

---

**Fecha de este documento**: 2026-05-29. Si pasan varias semanas, actualizá las versiones de las libs y la fecha del padrón antes del rollout.
