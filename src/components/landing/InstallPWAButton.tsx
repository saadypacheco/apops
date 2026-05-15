'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'desktop' | 'other'

type Variant = 'primary' | 'onBlue' | 'ghost' | 'compact' | 'fab' | 'fab-stacked'

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-brand-blue px-5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30',
  onBlue:
    'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold uppercase tracking-wider text-brand-deep shadow-cardHover transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40',
  ghost:
    'inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-full border-2 border-brand-blue px-4 text-sm font-bold uppercase tracking-wider text-brand-blue transition hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue',
  compact:
    'inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700',
  // FAB solo (páginas sin otro FAB): bottom-20, mismo nivel que un FAB típico
  fab:
    'fixed bottom-20 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-cardHover ring-4 ring-white/30 transition hover:scale-105 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40',
  // FAB apilado encima del FAB de contacto (en AppShell): bottom-36
  'fab-stacked':
    'fixed bottom-36 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-cardHover ring-4 ring-white/30 transition hover:scale-105 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40',
}

function isFabVariant(v: Variant): boolean {
  return v === 'fab' || v === 'fab-stacked'
}

export function InstallPWAButton({
  variant = 'primary',
  className,
  hideWhenInstalled = true,
  label = 'Instalar app',
}: {
  variant?: Variant
  className?: string
  /** Si ya está instalada, ¿esconder el botón? Default true. */
  hideWhenInstalled?: boolean
  /** Texto del botón (default: "Instalar app"). */
  label?: string
}) {
  const [mounted, setMounted] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<Platform>('other')
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    setMounted(true)

    // ¿Ya está instalada?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean })
        .standalone === true
    if (isStandalone) setInstalled(true)

    // Detectar plataforma
    const ua = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(ua) && !/(crios|fxios|edgios)/.test(ua)
    const isAndroid = /android/.test(ua)
    const isMobile = /mobile/.test(ua)
    setPlatform(
      isIos ? 'ios' : isAndroid ? 'android' : isMobile ? 'other' : 'desktop',
    )

    // Capturar beforeinstallprompt (Android/Chrome/Edge/desktop)
    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    // Si se instala desde el browser UI (no via prompt)
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const fab = isFabVariant(variant)

  // SSR / pre-hydration: render placeholder neutral para evitar layout shift
  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className={`${VARIANT_CLASS[variant]} ${className ?? ''} opacity-0`}
        aria-hidden
      >
        {fab ? <DownloadIconLarge /> : <><DownloadIcon />{label}</>}
      </button>
    )
  }

  if (installed && hideWhenInstalled) return null
  if (installed) {
    if (fab) return null
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 ${className ?? ''}`}
      >
        ✓ App instalada
      </span>
    )
  }

  async function handleClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null)
        }
      } catch {
        // Si falla el prompt, caemos a instrucciones
        setShowInstructions(true)
      }
    } else {
      // iOS no permite prompt programático; otros browsers tampoco siempre
      setShowInstructions(true)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={fab ? 'Instalar app' : undefined}
        title={fab ? 'Instalar app' : undefined}
        className={`${VARIANT_CLASS[variant]} ${className ?? ''}`}
      >
        {fab ? <DownloadIconLarge /> : <><DownloadIcon />{label}</>}
      </button>
      {showInstructions && (
        <InstallInstructionsModal
          platform={platform}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </>
  )
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="h-4 w-4"
    >
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
    </svg>
  )
}

function DownloadIconLarge() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      className="h-7 w-7"
    >
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
    </svg>
  )
}

// =====================================================================
// Modal con instrucciones por plataforma
// =====================================================================

function InstallInstructionsModal({
  platform,
  onClose,
}: {
  platform: Platform
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <h2
            id="install-title"
            className="text-lg font-bold text-brand-ink"
          >
            Instalar APOPS Siempre
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-2xl leading-none text-brand-muted hover:text-brand-ink"
          >
            ×
          </button>
        </header>

        <p className="mt-2 text-sm text-brand-muted">
          La app se agrega a la pantalla de inicio de tu dispositivo. No pasa
          por la Play Store ni App Store — todo desde el navegador.
        </p>

        <div className="mt-4">
          {platform === 'ios' && <InstructionsIOS />}
          {platform === 'android' && <InstructionsAndroid />}
          {platform === 'desktop' && <InstructionsDesktop />}
          {platform === 'other' && <InstructionsGeneric />}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white"
      >
        {n}
      </span>
      <span className="pt-0.5 text-sm text-brand-ink">{children}</span>
    </li>
  )
}

function InstructionsIOS() {
  return (
    <>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">
        iPhone / iPad — Safari
      </p>
      <ol className="flex flex-col gap-2">
        <Step n={1}>
          Asegurate de tener esta página abierta en <strong>Safari</strong>{' '}
          (no Chrome ni otro browser).
        </Step>
        <Step n={2}>
          Tocá el botón <strong>Compartir</strong> (cuadrado con flecha hacia
          arriba, abajo en el centro).
        </Step>
        <Step n={3}>
          Deslizá hacia abajo y elegí{' '}
          <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.
        </Step>
        <Step n={4}>
          Tocá <strong>Agregar</strong> arriba a la derecha. El ícono APOPS
          aparece en tu pantalla principal.
        </Step>
      </ol>
      <p className="mt-3 text-xs text-brand-muted">
        💡 Importante: para recibir notificaciones push, la app tiene que
        estar instalada como PWA — no funciona desde el navegador.
      </p>
    </>
  )
}

function InstructionsAndroid() {
  return (
    <>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">
        Android — Chrome
      </p>
      <ol className="flex flex-col gap-2">
        <Step n={1}>
          Si no apareció el banner automático &quot;Agregar a inicio&quot;,
          tocá el menú de los <strong>tres puntos ⋮</strong> arriba a la
          derecha.
        </Step>
        <Step n={2}>
          Elegí <strong>&quot;Instalar app&quot;</strong> o{' '}
          <strong>&quot;Agregar a pantalla principal&quot;</strong>.
        </Step>
        <Step n={3}>
          Confirmá el nombre. El ícono APOPS queda en tu home screen como
          cualquier otra app.
        </Step>
      </ol>
      <p className="mt-3 text-xs text-brand-muted">
        💡 Si usás Samsung Internet o Firefox móvil, el menú está en la barra
        inferior — opción &quot;Instalar página como app&quot;.
      </p>
    </>
  )
}

function InstructionsDesktop() {
  return (
    <>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">
        Computadora — Chrome / Edge / Brave
      </p>
      <ol className="flex flex-col gap-2">
        <Step n={1}>
          Buscá el ícono de <strong>instalar</strong> (cuadrado con flecha
          hacia abajo) a la derecha de la barra de URL.
        </Step>
        <Step n={2}>
          Si no aparece, andá al menú de los <strong>tres puntos ⋮</strong> y
          elegí <strong>&quot;Instalar APOPS Siempre…&quot;</strong>.
        </Step>
        <Step n={3}>
          Confirmá. Se abre como ventana independiente y queda en tus
          aplicaciones del sistema.
        </Step>
      </ol>
      <p className="mt-3 text-xs text-brand-muted">
        💡 Firefox no soporta instalación en desktop por ahora.
      </p>
    </>
  )
}

function InstructionsGeneric() {
  return (
    <>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">
        Cualquier navegador moderno
      </p>
      <ol className="flex flex-col gap-2">
        <Step n={1}>
          Abrí el menú principal del navegador (los tres puntos o líneas).
        </Step>
        <Step n={2}>
          Buscá la opción <strong>&quot;Instalar app&quot;</strong>,{' '}
          <strong>&quot;Agregar a pantalla de inicio&quot;</strong> o
          similar.
        </Step>
        <Step n={3}>
          Confirmá. Si tu navegador no la trae, podés seguir usando la app
          desde la URL <code className="font-mono">apops.vercel.app</code>.
        </Step>
      </ol>
    </>
  )
}
