# Deploy en VPS Hostinger (patrón Traefik + Docker)

Guía para migrar APOPS Siempre de Vercel a tu VPS Hostinger
siguiendo el mismo patrón que MentorComercial y solucionesdentales.

---

## TL;DR

Tu VPS ya tiene **Traefik corriendo** con red `traefik` externa y SSL
Let's Encrypt automático. APOPS se suma como un container más que
declara labels para que Traefik lo enrute por dominio:

```bash
# En el VPS, dentro del directorio del repo:
cp .env.prod.example .env
nano .env                                              # completar todas las vars
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

3 minutos después, https://app.apops.org.ar está sirviendo el deploy
con SSL automático. Sin pagar Vercel.

---

## Pre-requisitos en el VPS

Estos ya los tenés porque MentorComercial está corriendo, pero los
listo por completitud:

- Docker + Docker Compose v2 instalados.
- Red Docker externa llamada `traefik` creada (`docker network create traefik`).
- Container Traefik corriendo + reverse proxy configurado con cert
  resolver `letsencrypt`.
- Puertos 80 y 443 abiertos en el firewall del VPS.

Si el VPS está limpio, podés instalar todo lo anterior siguiendo la
guía del setup de MentorComercial (`infra/README.md`).

---

## Paso 1 — DNS

Apuntá el dominio (o subdominio) que vayas a usar al IP del VPS.

```
A    app.apops.org.ar        ->  <IP del VPS>
A    www.app.apops.org.ar    ->  <IP del VPS>   (opcional)
```

TTL 3600 está bien. La propagación tarda de minutos a horas según el provider.

---

## Paso 2 — Clonar el repo en el VPS

```bash
# SSH al VPS
ssh root@<IP-VPS>

# Crear directorio y clonar
mkdir -p /opt/proyectos
cd /opt/proyectos
git clone https://github.com/saadypacheco/apops.git apops
cd apops
```

---

## Paso 3 — Configurar variables de entorno

```bash
cp .env.prod.example .env
nano .env
```

Completar **todas** las variables. Las claves a tener a mano:

| Variable | De dónde sale |
|---|---|
| `DOMAIN` | El subdominio que apuntaste en el paso 1 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Idem, key `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem, key `service_role` (SECRETA) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` (corres una vez) |
| `VAPID_PRIVATE_KEY` | Mismo comando |
| `VAPID_SUBJECT` | `mailto:apops@apops.org.ar` (o el email del gremio) |
| `RESEND_API_KEY` | Resend Dashboard → API Keys (después de verificar dominio) |
| `EMAIL_FROM` | `APOPS Siempre <noreply@apops.org.ar>` (alias del dominio verificado en Resend) |

⚠️ **El `.env` no se commitea** (está en `.gitignore`). Existe solo en el VPS.

---

## Paso 4 — Build y arranque

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Qué hace:

- `--build`: construye la imagen `apops-web` con el Dockerfile multi-stage.
- `-d`: corre en background (detached).
- Traefik detecta el container nuevo por las labels y emite el cert SSL automático.

**Tarda ~3-5 minutos** la primera vez (npm install + next build). Las
siguientes son ~1-2 min porque Docker cachea capas.

---

## Paso 5 — Verificar

```bash
# Ver logs en vivo (Ctrl+C para salir, el container sigue)
docker compose -f docker-compose.prod.yml logs -f apops-web

# Status del container
docker ps | grep apops-web

# Probar la URL
curl -I https://app.apops.org.ar
# Debería responder 200 con cabecera de Vercel reemplazada por la del server
```

En el navegador: entrar a `https://app.apops.org.ar` — la landing tiene
que cargar como en Vercel.

---

## Workflow de actualización

Cada vez que hay cambios en main:

```bash
cd /opt/proyectos/apops
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

El `up -d --build` reconstruye solo si hay cambios (Docker cachea).

### Opcional — GitHub Action que deploya automático

Si querés que cada push a main deploye sin SSH manual, crear
`.github/workflows/deploy-hostinger.yml`:

```yaml
name: Deploy a Hostinger VPS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/proyectos/apops
            git pull origin main
            docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Hay que cargar los 3 secrets en GitHub: Settings → Secrets and variables → Actions.

---

## Migrar el dominio desde Vercel

Cuando hayas verificado que `https://app.apops.org.ar` funciona en el VPS:

1. En **Vercel Dashboard** → Settings → Domains → eliminar el dominio
   custom (si lo tenías ahí).
2. En **DNS provider** → confirmar que el A record apunta SOLO al VPS.
3. Probar la URL — debería seguir cargando, pero ahora desde el VPS.
4. En **Vercel** → Settings → General → Delete Project (o pausar el
   deploy). Cancelar el plan Pro si lo tenías.

⚠️ **Cancelar Vercel solo después de verificar que el VPS responde OK
por varias horas**, no inmediato. Por las dudas.

---

## Costos comparados

| Concepto | Vercel Pro | VPS Hostinger (ya pagado por otros proyectos) |
|---|---|---|
| Mensual | USD 20 | USD 0 incremental (compartís con MentorComercial, etc.) |
| Bandwidth | 1 TB/mes | Ilimitado en la mayoría de planes Hostinger |
| Operación dev | 0h/mes | ~0.5h/mes adicional (es un container más en el mismo VPS) |
| **Total APOPS** | **USD 20/mes** | **USD 0/mes** |

---

## Lo que perdés vs Vercel (y mitigación)

| Feature Vercel | Cómo lo cubrís en VPS |
|---|---|
| Preview deployments por PR | No tenés equivalente directo. Si lo necesitás, levantar otro container con label `*.preview.apops.org.ar` (extra setup) |
| CDN global mundial | Cloudflare gratuito delante del VPS (proxy mode) → CDN + WAF + DDoS |
| Rollback 1-click | `git revert <commit> && docker compose up -d --build` |
| Build minutes | No hay límite — usás CPU/RAM del VPS |
| Métricas integradas | Logs con `docker logs` + opcional Grafana/Loki si querés más |
| Auto-scaling | El VPS escala vertical (cambiar de KVM 1 a KVM 2). Para mucho tráfico, hay otras estrategias |

Para una app de gremio con ~4k afiliados, **ninguno de esos features son críticos**. La VPS con Cloudflare delante es más que suficiente.

---

## Troubleshooting

### "no se puede conectar" después del up
- ¿El container está corriendo? `docker ps | grep apops-web`
- ¿Hay errores en logs? `docker compose logs -f apops-web`
- ¿Traefik ve el container? `docker logs traefik 2>&1 | grep apops`

### SSL no se emite (página dice "Not Secure")
- Esperar 1-2 min más después del primer arranque (Let's Encrypt tarda)
- Verificar que el DNS A record propagó: `dig app.apops.org.ar`
- Verificar logs Traefik por errores ACME: `docker logs traefik 2>&1 | grep -i acme`

### Build falla con "Cannot find module sharp"
- Sharp necesita `libc6-compat` en Alpine. El Dockerfile lo instala.
- Si igual falla, agregar a la etapa builder: `RUN apk add --no-cache python3 make g++`

### El container reinicia en loop
- `docker compose logs apops-web --tail 100` para ver el error
- Si dice "missing env var", chequear que el `.env` esté completo y la
  ruta del `--env-file` esté bien

### Cómo limpiar imágenes viejas para liberar espacio
```bash
docker image prune -af --filter "until=72h"
```

---

## Próximos pasos sugeridos

1. **Hoy**: probar todo el flujo de deploy en una sub-ruta de prueba (ej. `app-test.apops.org.ar`) sin tocar Vercel todavía.
2. **Cuando funcione**: migrar el dominio principal y cancelar Vercel.
3. **Después**: agregar Cloudflare gratuito delante del VPS para CDN + DDoS protection.
4. **Bonus**: Configurar backups automáticos del VPS (Hostinger tiene snapshots).

---

## Soporte rápido

Si algo no funciona en el VPS, mandame:
- Output de `docker compose -f docker-compose.prod.yml logs --tail 100 apops-web`
- Output de `docker ps`
- Tu `.env` con los **secretos tachados** (xxx)

Con eso reproduzco el problema y arreglo.
