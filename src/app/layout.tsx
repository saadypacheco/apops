import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'APOPS Siempre',
    template: '%s · APOPS Siempre',
  },
  description:
    'App del gremio APOPS de ANSES — consultas, comunicados y credencial digital.',
  manifest: '/manifest.json',
  applicationName: 'APOPS Siempre',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'APOPS',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#042C53',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  // userScalable: true → cumplimiento constitución II (tipografía escalable
  // para personas mayores). NO bloquear el zoom del usuario.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
