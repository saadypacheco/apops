'use client'

import { useState } from 'react'

// Botón flotante de ayuda. Abre un sheet con opciones de contacto:
// WhatsApp, email, teléfono. Útil para gente que no puede ingresar
// y necesita asistencia humana.
//
// TODO: confirmar el número oficial de WhatsApp del gremio. Por ahora
// usa el teléfono institucional que figura en apops.org.ar.

const WHATSAPP_NUMBER = '5491155448300' // (011) 5544-8300 → formato internacional
const EMAIL = 'apops@apops.org.ar'
const TELEFONO = '+541155448300'

export function HelpButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="¿Necesitás ayuda?"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-deep shadow-cardHover ring-1 ring-black/5 transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          className="h-7 w-7"
        >
          <circle cx="12" cy="12" r="10" />
          <path
            d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4M12 18h.01"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Opciones de contacto"
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 px-4 pb-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-cardHover"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-ink">
                ¿Necesitás ayuda?
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-full text-brand-muted hover:bg-neutral-100"
              >
                ✕
              </button>
            </header>

            <p className="mb-4 text-sm text-brand-muted">
              Si no podés ingresar o querés hacer una consulta, escribinos.
              Estamos para ayudarte.
            </p>

            <div className="flex flex-col gap-2">
              <ContactLink
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, necesito ayuda con APOPS Siempre.')}`}
                label="WhatsApp"
                hint="Respuesta más rápida"
                icon={
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path d="M20.5 3.5A11 11 0 003.6 17l-1.5 5.5 5.6-1.5a11 11 0 0012.8-17.5zm-8.5 17a9 9 0 01-4.6-1.3l-.3-.2-3.3.9.9-3.2-.2-.3a9 9 0 1115 4.5 9 9 0 01-7.5-.4zm5.1-6.7c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.6.1l-.9 1.2c-.2.2-.3.2-.6.1a7.4 7.4 0 01-3.6-3.2c-.3-.5.3-.4.7-1.4.1-.2.1-.3 0-.5l-.9-2.1c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3c-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3z" />
                  </svg>
                }
                color="bg-[#25D366] text-white"
              />
              <ContactLink
                href={`mailto:${EMAIL}?subject=${encodeURIComponent('Consulta APOPS Siempre')}`}
                label="Email"
                hint={EMAIL}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" strokeLinecap="round" />
                  </svg>
                }
                color="bg-brand-blue text-white"
              />
              <ContactLink
                href={`tel:${TELEFONO}`}
                label="Llamar"
                hint="(011) 5544-8300"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                    <path
                      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                color="bg-brand-deep text-white"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ContactLink({
  href,
  label,
  hint,
  icon,
  color,
}: {
  href: string
  label: string
  hint: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <a
      href={href}
      target={href.startsWith('https://') ? '_blank' : undefined}
      rel={href.startsWith('https://') ? 'noopener noreferrer' : undefined}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-transform hover:scale-[1.02] ${color}`}
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex flex-col text-left">
        <span className="text-base font-bold">{label}</span>
        <span className="text-xs opacity-90">{hint}</span>
      </div>
    </a>
  )
}
