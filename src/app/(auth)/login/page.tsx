import { redirect } from 'next/navigation'

// La pantalla de login ahora vive en `/` (landing con noticias + login).
// Mantenemos /login como ruta canónica del flujo: redirige al landing.

export default function LoginPage() {
  redirect('/')
}
