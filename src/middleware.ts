import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Excluye assets estáticos y archivos del manifest PWA. El resto de las
  // rutas pasa por el helper updateSession, que decide si redirige a /login
  // según la lista de PUBLIC_PATHS en lib/supabase/middleware.ts.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
