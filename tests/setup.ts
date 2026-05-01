// Vitest setup global
// Cargar variables de entorno de prueba si existen
import { config } from 'node:process';

// Sin dependencia de @testing-library/jest-dom todavía — frontend tests
// se setean cuando hagamos componentes en Phase 3 (T038+)

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
}
