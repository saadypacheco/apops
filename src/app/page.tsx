import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Logo } from '@/components/landing/Logo'
import {
  NoticiasCarousel,
  type Noticia,
} from '@/components/landing/NoticiasCarousel'
import { LandingLoginCard } from '@/components/landing/LandingLoginCard'

export const metadata = {
  title: 'APOPS Siempre — Bienvenida',
  description:
    'Plataforma del gremio APOPS de ANSES. Ingresá para acceder a comunicados, consultas y servicios.',
}

// Landing pública con noticias del sindicato + login en una sola página.
// Si el usuario ya tiene sesión, lo ruteamos a su home según rol.

async function getRoleHomeFor(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('afiliados')
    .select('rol')
    .eq('auth_user_id', userId)
    .maybeSingle()
  const rol = data?.rol ?? 'afiliado'
  if (rol === 'admin') return '/admin'
  if (rol === 'delegado') return '/delegados'
  return '/feed'
}

export default async function LandingPage() {
  // 1. Si ya tiene sesión → home según rol
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect(await getRoleHomeFor(user.id))
  }

  // 2. Anon: fetch noticias publicadas (RLS permite anon SELECT)
  // Cast por mismatch entre supabase-js 2.45 y el types.ts generado por CLI más nuevo;
  // los datos del runtime son los correctos (RLS los filtra por publicada=true).
  const { data: noticiasRaw } = (await supabase
    .from('noticias')
    .select('id, titulo, resumen, publicada_at, autor, destacada')
    .eq('publicada', true)
    .order('publicada_at', { ascending: false })
    .limit(8)) as { data: Noticia[] | null }

  const noticias: Noticia[] = noticiasRaw ?? []

  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-gradient">
      {/* Decoración: círculos translúcidos para textura */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-48 h-48 w-48 rounded-full bg-brand-lime/30 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col gap-6 pt-10 pb-10">
        <header className="px-5">
          <Logo />
        </header>

        <NoticiasCarousel noticias={noticias} />

        <LandingLoginCard />

        <footer className="mt-auto px-5 pt-4 text-center text-xs text-white/75">
          <p>APOPS · Asociación de Profesionales de ANSES</p>
          <p className="mt-1">Sin contraseña — accedés con un enlace por email.</p>
        </footer>
      </div>
    </main>
  )
}
