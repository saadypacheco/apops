/**
 * Home placeholder.
 *
 * Phase 1 (Setup) crea esta página solo para verificar que `npm run dev`
 * arranca sin errores. La home definitiva se construye en feature 002+
 * (no es alcance de 001-afiliado-auth).
 *
 * El usuario autenticado verá su feed; el no autenticado será redirigido
 * a /login por el middleware de Next.js (T024 en Phase 2).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-[#042C53]">
          APOPS Siempre
        </h1>
        <p className="mt-3 text-base text-[#5F5E5A]">
          Setup en marcha. La feature 001-afiliado-auth está en construcción.
        </p>
      </div>
    </main>
  );
}
