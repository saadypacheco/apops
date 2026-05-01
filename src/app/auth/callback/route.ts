// Route Handler: GET /auth/callback
// Spec: specs/001-afiliado-auth/contracts/route-auth-callback.json
//
// Maneja el aterrizaje del usuario tras hacer clic en el magic link.
// Intercambia el código por sesión, refresca la cookie HTTP-only de Supabase,
// actualiza last_login_at en afiliados (con service_role) y redirige a /feed
// (o al `next` validado).

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SAFE_NEXT_RE = /^\/[a-z0-9/_-]*$/i
const DEFAULT_NEXT = '/feed'

function safeNext(input: string | null): string {
  if (!input) return DEFAULT_NEXT
  if (!SAFE_NEXT_RE.test(input)) return DEFAULT_NEXT
  return input
}

function getClientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]
    return first ? first.trim() : null
  }
  return req.headers.get('x-real-ip')
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const otpType = url.searchParams.get('type')
  const errorParam = url.searchParams.get('error')
  const next = safeNext(url.searchParams.get('next'))

  // 1. Si Supabase reportó error en query, redirect a expirado
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/magic-link-expirado?reason=${encodeURIComponent(errorParam)}`, url),
    )
  }

  const supabase = createClient()

  // 2. Dos flows posibles según cómo viene el link:
  //    - PKCE:           ?code=...  → exchangeCodeForSession
  //    - magic link OTP: ?token_hash=...&type=magiclink → verifyOtp
  let userId: string | null = null

  if (code) {
    const exchange = await supabase.auth.exchangeCodeForSession(code)
    if (exchange.error || !exchange.data.user) {
      return NextResponse.redirect(
        new URL('/magic-link-expirado?reason=invalid', url),
      )
    }
    userId = exchange.data.user.id
  } else if (tokenHash && otpType) {
    const verify = await supabase.auth.verifyOtp({
      type: otpType as 'magiclink' | 'email' | 'recovery' | 'invite',
      token_hash: tokenHash,
    })
    if (verify.error || !verify.data.user) {
      return NextResponse.redirect(
        new URL('/magic-link-expirado?reason=invalid', url),
      )
    }
    userId = verify.data.user.id
  } else {
    return NextResponse.redirect(new URL('/login?error=missing_code', url))
  }
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? null

  // 4. Verificar que existe afiliado vinculado y actualizar last_login_at
  const admin = createAdminClient()
  const { data: afiliado } = await admin
    .from('afiliados')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (!afiliado) {
    // User en auth.users pero sin afiliado vinculado → estado inválido.
    // Cerrar sesión, audit, redirect a login.
    await admin.from('audit_log').insert({
      evento: 'authentication_failure',
      ip_address: ip,
      user_agent: userAgent,
      metadata: { reason: 'afiliado_no_vinculado', user_id: userId },
    })
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL('/login?error=cuenta_invalida', url),
    )
  }

  await admin
    .from('afiliados')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', afiliado.id)

  await admin.from('audit_log').insert({
    evento: 'authentication_success',
    afiliado_id: afiliado.id,
    ip_address: ip,
    user_agent: userAgent,
    metadata: { next },
  })

  return NextResponse.redirect(new URL(next, url))
}
