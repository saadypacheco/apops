// Indicador de pasos arriba del wizard de afiliación.
// 3 círculos con números + conectores + label debajo.
// Estados: completado (✓) / actual (número con ring) / pendiente (gris).

type StepIndicatorProps = {
  current: 1 | 2 | 3
  steps: [string, string, string]
}

export function StepIndicator({ current, steps }: StepIndicatorProps) {
  return (
    <nav aria-label="Progreso de afiliación">
      <ol className="flex items-start justify-between gap-1">
        {steps.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const isDone = stepNum < current
          const isCurrent = stepNum === current
          const isFuture = stepNum > current

          return (
            <li key={stepNum} className="flex flex-1 flex-col items-center">
              <div className="relative flex w-full items-center">
                {/* Conector izquierdo (excepto el primero) */}
                {i > 0 && (
                  <div
                    className={
                      'absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2 ' +
                      (isDone || isCurrent ? 'bg-brand-blue' : 'bg-neutral-300')
                    }
                  />
                )}
                {/* Conector derecho (excepto el último) */}
                {i < steps.length - 1 && (
                  <div
                    className={
                      'absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2 ' +
                      (isDone ? 'bg-brand-blue' : 'bg-neutral-300')
                    }
                  />
                )}
                {/* Círculo numerado */}
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={
                    'relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ' +
                    (isDone
                      ? 'bg-brand-blue text-white'
                      : isCurrent
                        ? 'bg-brand-blue text-white ring-4 ring-brand-blue/20'
                        : 'bg-white text-brand-muted ring-2 ring-neutral-300')
                  }
                >
                  {isDone ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-5 w-5">
                      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </span>
              </div>
              <span
                className={
                  'mt-2 text-center text-xs font-medium leading-tight sm:text-sm ' +
                  (isCurrent
                    ? 'text-brand-ink'
                    : isFuture
                      ? 'text-brand-muted'
                      : 'text-brand-blue')
                }
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
