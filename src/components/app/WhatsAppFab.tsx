'use client'

import { useEffect, useRef, useState } from 'react'
import type { Rol } from '@/lib/auth/role'

// FAB de contacto en todas las pantallas autenticadas.
//
// - Afiliado: abre un menú con 3 opciones de contacto a APOPS
//   (WhatsApp, Email, Llamar). El destinatario es el gremio.
// - Admin / Delegado: abre WhatsApp con saludo pre-cargado y SIN
//   destinatario — eligen contacto desde su agenda para escribir
//   ad-hoc a afiliados o terceros.

const APOPS_WHATSAPP = '5491155448300'
const APOPS_TEL = '+5491155448300'
const APOPS_EMAIL = 'apops@apops.org.ar'

function firstName(nombre: string): string {
  const parts = nombre.split(',')
  if (parts.length === 2) {
    const nombres = parts[1]?.trim().split(/\s+/) ?? []
    return nombres[0] ?? nombre
  }
  return nombre.split(/\s+/)[0] ?? nombre
}

function saludoStaff(nombre: string, rol: Rol): string {
  const first = firstName(nombre)
  if (rol === 'admin') {
    return `Hola, soy ${first} de la administración APOPS. `
  }
  return `Hola, soy ${first}, tu delegado/a APOPS. `
}

export function WhatsAppFab({
  nombre,
  rol,
}: {
  nombre: string
  rol: Rol
}) {
  if (rol === 'afiliado') {
    return <ContactoAPOPSFab nombre={nombre} />
  }
  return <StaffFab nombre={nombre} rol={rol} />
}

// ─── FAB afiliado → contacto a APOPS (menú 3 opciones) ────────────────

function ContactoAPOPSFab({ nombre }: { nombre: string }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const saludo = `Hola APOPS, soy ${firstName(nombre)}, quisiera hacerles una consulta:`
  const waUrl = `https://wa.me/${APOPS_WHATSAPP}?text=${encodeURIComponent(saludo)}`
  const mailtoUrl = `mailto:${APOPS_EMAIL}?subject=${encodeURIComponent('Consulta de afiliado')}&body=${encodeURIComponent(saludo)}`

  // Cerrar al click afuera o ESC.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={wrapperRef}
      className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2"
    >
      {open && (
        <div
          role="menu"
          aria-label="Contactar a APOPS"
          className="flex flex-col items-end gap-2"
        >
          <FabAction
            href={waUrl}
            external
            label="WhatsApp"
            bgClass="bg-[#25D366] hover:bg-[#1ebb5a]"
            icon={<WhatsAppIcon />}
            onClick={() => setOpen(false)}
          />
          <FabAction
            href={mailtoUrl}
            label="Email"
            bgClass="bg-brand-blue hover:bg-brand-blue/90"
            icon={<EmailIcon />}
            onClick={() => setOpen(false)}
          />
          <FabAction
            href={`tel:${APOPS_TEL}`}
            label="Llamar"
            bgClass="bg-brand-teal hover:bg-brand-teal/90"
            icon={<PhoneIcon />}
            onClick={() => setOpen(false)}
          />
        </div>
      )}

      <button
        type="button"
        aria-label={open ? 'Cerrar menú de contacto' : 'Contactar a APOPS'}
        aria-expanded={open}
        title="Contactar a APOPS"
        onClick={() => setOpen((v) => !v)}
        className={
          'inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-cardHover ring-4 ring-white/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/40 ' +
          (open ? 'rotate-45' : '')
        }
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  )
}

function FabAction({
  href,
  external,
  label,
  bgClass,
  icon,
  onClick,
}: {
  href: string
  external?: boolean
  label: string
  bgClass: string
  icon: React.ReactNode
  onClick?: () => void
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2"
    >
      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-ink shadow-card">
        {label}
      </span>
      <span
        className={
          'inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-card transition ' +
          bgClass
        }
      >
        {icon}
      </span>
    </a>
  )
}

// ─── FAB staff (admin / delegado) → WhatsApp libre ad-hoc ──────────────

function StaffFab({ nombre, rol }: { nombre: string; rol: Rol }) {
  const url = `https://wa.me/?text=${encodeURIComponent(saludoStaff(nombre, rol))}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Enviar mensaje por WhatsApp"
      title="Enviar WhatsApp — vas a poder elegir el contacto"
      className="fixed bottom-20 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-cardHover ring-4 ring-white/30 transition hover:scale-105 hover:bg-[#1ebb5a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
    >
      <WhatsAppIcon />
    </a>
  )
}

// ─── icons ─────────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="h-6 w-6"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-5 w-5">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 8l9 6 9-6" strokeLinecap="round" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-5 w-5">
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72a2 2 0 011.72 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      className="h-7 w-7"
    >
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden className="h-7 w-7">
      <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
    </svg>
  )
}
