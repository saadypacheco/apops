import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/landing/Logo'

export const metadata: Metadata = {
  title: 'Solicitud enviada',
}

// Pantalla de confirmación post solicitarAcceso (F4). Aterrizan acá tras
// insertar exitosamente en solicitudes_pendientes.
export default function SolicitudEnviadaPage() {
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center bg-brand-gradient px-6 text-center">
      <div className="flex max-w-md flex-col items-center gap-5 text-white">
        <Logo width={200} />

        <span
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-lime/25 text-white ring-4 ring-white/30"
        >
          <CheckIcon />
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Solicitud enviada</h1>
          <p className="text-sm text-white/85">
            Recibimos tu pedido de acceso. Un administrador va a revisarlo y
            te vamos a contactar al email que indicaste.
          </p>
          <p className="text-xs text-white/70">
            Si tu caso es urgente, podés contactarnos por WhatsApp.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <a
            href="https://wa.me/5491155448300"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-bold text-white shadow-card transition hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            <WhatsAppIcon />
            Contactar por WhatsApp
          </a>
          <Link
            href="/"
            className="text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-8 w-8" aria-hidden>
      <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
