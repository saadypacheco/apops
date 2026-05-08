import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

type CookieToSet = { name: string; value: string; options: CookieOptions }

// Rutas públicas (no requieren sesión). Coinciden con las páginas del grupo
// (auth) y con el route handler /auth/callback declarado en supabase/config.toml.
const PUBLIC_PATHS = new Set<string>([
  '/',
  '/login',
  // Auth v2 (auth-v2.md)
  '/registrarse',
  '/login-magic-link',
  '/recuperar-clave',
  '/no-en-padron',
  '/solicitud-enviada',
  // Auth v1 — vigentes hasta que F3 las absorba
  '/magic-link-enviado',
  '/magic-link-expirado',
  '/pendiente-validacion',
  // Afiliación pública
  '/afiliarse',
  '/afiliarse/exito',
  // Listado público de noticias (la vista individual /noticias/[id]
  // entra por PUBLIC_PREFIXES abajo)
  '/noticias',
  // Landing demostrativa pública (qué ofrece la app)
  '/software',
])

const PUBLIC_PREFIXES = [
  '/auth/callback',
  // Vista pública de credencial de adherente (feature 004).
  // El UUID actúa como secret — no requiere auth.
  '/credencial-publica',
  // Endpoint de diagnóstico: verifica conexión a Supabase desde el server.
  '/api/health',
  // Vista individual pública de noticia: /noticias/<uuid>
  '/noticias',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() refresca el access token si está cerca de expirar.
  // Si hay cookies de sesión inválidas/parciales (caso típico: cookies
  // de otra app en localhost), tira refresh_token_not_found. Lo tratamos
  // como "no hay sesión" en silencio.
  let user: { id: string } | null = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    user = null
  }

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
