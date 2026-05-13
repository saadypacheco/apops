/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
    // Default 1MB. Padrón ANSES con ~15k filas pesa 3-5MB; 15MB da margen.
    serverActions: { bodySizeLimit: '15mb' },
  },
};

// Bundle analyzer opt-in: `ANALYZE=true npm run build` (o `npm run analyze`)
// abre un navegador con el reporte. En CI no se activa (no hay var ANALYZE).
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : (config) => config;

module.exports = withBundleAnalyzer(nextConfig);
