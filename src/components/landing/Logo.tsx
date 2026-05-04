// Logo APOPS — placeholder con marca textual + ícono de manos.
// Cuando llegue el logo oficial del gremio, reemplazar por <Image>.

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="h-14 w-14 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 42c2-1 4-2 7-2 4 0 6 2 11 2s7-2 11-2c3 0 5 1 7 2" />
        <path d="M16 42v-8c0-3 2-5 5-5h22c3 0 5 2 5 5v8" />
        <path d="M22 30v-6c0-3 2-5 5-5h10c3 0 5 2 5 5v6" />
        <path d="M28 19v-3c0-2 1-4 4-4s4 2 4 4v3" />
      </svg>
      <h1 className="text-3xl font-bold tracking-wide text-white">
        APOPS<span className="font-light"> Siempre</span>
      </h1>
      <p className="text-sm font-medium uppercase tracking-widest text-white/85">
        Asociación de Profesionales de ANSES
      </p>
    </div>
  )
}
