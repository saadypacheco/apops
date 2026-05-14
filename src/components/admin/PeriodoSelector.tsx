'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type Option = {
  periodoYear: number
  periodoMonth: number
  label: string
}

type Props = {
  options: Option[]
  /** Período actualmente seleccionado en formato YYYY-MM (e.g. "2016-07") */
  value: string
}

export function PeriodoSelector({ options, value }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams?.toString())
    params.set('periodo', e.target.value)
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-brand-muted">Período:</span>
      <select
        value={value}
        onChange={onChange}
        disabled={pending}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50"
      >
        {options.map((o) => {
          const v = `${o.periodoYear}-${String(o.periodoMonth).padStart(2, '0')}`
          return (
            <option key={v} value={v}>
              {o.label}
            </option>
          )
        })}
      </select>
      {pending && (
        <span aria-live="polite" className="text-xs text-brand-muted">
          cargando…
        </span>
      )}
    </label>
  )
}
