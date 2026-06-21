# Imagen de producción de APOPS Siempre (patrón MentorComercial/solucionesdentales).
# Para deploy en VPS Hostinger detrás de Traefik que ya está corriendo en la red `traefik`.
#
# Build:   docker compose -f docker-compose.prod.yml --env-file .env up -d --build
# Local:   npm run dev (sin Docker)
#
# Multi-stage:
#   1. builder — instala deps + corre `next build` con NEXT_PUBLIC_* inyectadas
#   2. runner  — imagen final, solo lo necesario para `next start`

# ─── Etapa 1: BUILD ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# libc6-compat: necesario para sharp + algunas libs nativas en Alpine
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* se hornean en el bundle del cliente durante el build,
# así que vienen como ARG y se inyectan al `npm run build`.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

RUN npm run build

# ─── Etapa 2: RUNNER ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat

# Solo dependencies de producción
COPY package*.json ./
RUN npm install --omit=dev

# Output del build
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# Los server actions necesitan los archivos compilados de src/, pero `next start`
# usa el output de .next/server. No hace falta copiar src/.

EXPOSE 3000
CMD ["npm", "start"]
