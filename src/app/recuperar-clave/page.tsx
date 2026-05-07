import { redirect } from 'next/navigation'

// F3: alias de /login-magic-link?modo=reset (auth-v2.md, tabla "Pantallas").
// Permite linkear a una URL natural sin query string.
export default function RecuperarClavePage() {
  redirect('/login-magic-link?modo=reset')
}
