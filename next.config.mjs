/** @type {import('next').NextConfig} */
const isTauri = process.env.TAURI === '1' || process.env.TAURI === 'true';

const nextConfig = {
  reactStrictMode: true,
  // Tauri needs static export → out/index.html
  // Electron uses Node server → standalone
  output: isTauri ? 'export' : 'standalone',
  distDir: isTauri ? 'out' : '.next',
  trailingSlash: isTauri ? true : false,
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'tesseract.js']
  }
};

export default nextConfig;
