'use client'

import { useEffect, useRef, useState } from 'react'

// Canvas para firma digital. Captura mouse + touch (mobile).
// El valor se sincroniza a un input hidden con el name dado, así viaja
// con el form al submit. Devuelve PNG dataURL.
//
// Sin librerías externas — implementación nativa sobre <canvas>.

type Point = { x: number; y: number }

export function SignaturePad({
  name,
  width = 600,
  height = 200,
  onChange,
}: {
  name: string
  width?: number
  height?: number
  onChange?: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const [hasContent, setHasContent] = useState(false)

  // Configurar canvas en mount + escala HiDPI
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0F2A47'
    // fondo blanco (para que el PNG no quede transparente y se vea en el PDF)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    isDrawingRef.current = true
    lastPointRef.current = getPoint(e)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pt = getPoint(e)
    const last = lastPointRef.current ?? pt
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPointRef.current = pt
  }

  function endDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    syncToHidden()
  }

  function syncToHidden() {
    const canvas = canvasRef.current
    const input = inputRef.current
    if (!canvas || !input) return
    // Re-detectar si hay tinta sobre el fondo blanco
    const empty = isCanvasBlank(canvas)
    setHasContent(!empty)
    const dataUrl = empty ? '' : canvas.toDataURL('image/png')
    input.value = dataUrl
    onChange?.(dataUrl || null)
  }

  function clearPad() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    syncToHidden()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-md border-2 border-dashed border-neutral-300 bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          aria-label="Firmá con el dedo o el mouse en este recuadro"
          className="block touch-none"
          style={{ width: '100%', height: 'auto', maxWidth: width }}
        />
      </div>
      <input ref={inputRef} type="hidden" name={name} defaultValue="" />
      <div className="flex items-center justify-between text-xs text-brand-muted">
        <span>
          {hasContent ? '✓ Firma capturada' : 'Firmá con el dedo (o mouse)'}
        </span>
        <button
          type="button"
          onClick={clearPad}
          className="font-medium text-brand-blue underline-offset-4 hover:underline"
        >
          Borrar
        </button>
      </div>
    </div>
  )
}

// Heurística rápida: si todos los pixels son blancos (255,255,255), está vacío.
// Sample sparse para no escanear todo el array de pixels.
function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return true
  const { width, height } = canvas
  const step = Math.max(8, Math.floor(width / 100))
  const data = ctx.getImageData(0, 0, width, height).data
  for (let i = 0; i < data.length; i += step * 4) {
    if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
      return false
    }
  }
  return true
}
