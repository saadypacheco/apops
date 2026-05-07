# Credencial Digital — Spec MVP

> Feature 004. Estado: en implementación 2026-05-05.

## Objetivo

Permitir al afiliado titular ver su credencial digital y la de cada uno de
sus adherentes (familiares cargados en el padrón). Reenviar la credencial
del adherente vía WhatsApp / email (link público temporal).

## Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D1 | Tabla `padron_adherentes` paralela a `padron_cotizantes` — feature externa hace el ingest | El usuario confirmó: planilla externa carga datos, esta feature solo lee. |
| D2 | Vínculo titular ↔ adherente por `titular_dni` o `titular_legajo` (al menos uno) | Confirmado por el usuario. Refleja que la planilla viene con identificadores variables. |
| D3 | Sin foto, sin QR (MVP) | El usuario pidió simplicidad inicial. |
| D4 | Adherente es "Afiliado Adherente" (no comparte credencial con titular) | Cada uno tiene su número propio. |
| D5 | Solo el titular logueado ve sus credenciales (la propia + la de adherentes). RLS por DNI/legajo. | Adherentes no tienen cuenta propia. |
| D6 | Reenvío por link público temporal `/credencial-publica/{adherente_id}` | Sin tokens firmados (MVP). El UUID del adherente actúa como secret. |
| D7 | Botón "Compartir" prioriza **WhatsApp** (`wa.me`) con texto pre-poblado, además email y copiar link | Usuario remarcó que el envío por WA tiene que ser fácil. |
| D8 | Carrusel con flechas izq/der manual, indicador "X de N". NO autoplay | Especificado por el usuario. |

## Modelo de datos

```sql
CREATE TABLE padron_adherentes (
  id                uuid PRIMARY KEY,
  titular_dni       text,
  titular_legajo    text,
  nombre            text NOT NULL,
  dni               text,                    -- nullable (menores de edad)
  vinculo           text NOT NULL,           -- 'conyuge'|'hijo'|'hija'|'padre'|'madre'|'hermano'|'hermana'|'otro'
  fecha_nacimiento  date,
  numero_afiliado   text,
  email             text,                    -- para reenvío
  telefono          text,                    -- para reenvío WA
  source_batch      uuid NOT NULL,
  ingestado_at      timestamptz DEFAULT now(),
  CONSTRAINT chk_titular_id CHECK (titular_dni IS NOT NULL OR titular_legajo IS NOT NULL)
);
```

RLS: SELECT solo si el `auth.uid()` mapea a un afiliado cuyo `dni` o
`legajo` coincide con `titular_dni` o `titular_legajo`.

## Pantallas

| Ruta | Quién | Qué hace |
|---|---|---|
| `/credencial` | Afiliado logueado | Carrusel con su credencial + las de sus adherentes |
| `/credencial-publica/{id}` | Cualquiera (anon) | Vista de la credencial de un adherente. Sin info del titular más allá del vínculo. |

## Fuera de scope (futuro)

- Foto upload + Storage
- QR code (texto plano o token firmado)
- Descarga PDF
- Validación de credencial (escaneo / endpoint `/validar`)
- Tokens firmados con expiry para `/credencial-publica`
