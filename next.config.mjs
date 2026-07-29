/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Default Next.js server output — works on Vercel and `next start`.
  // Do not use `export` or Electron/Tauri packaging modes.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*", "./src/data/**/*"],
  },
  serverExternalPackages: ["pg", "@electric-sql/pglite", "@cloudbase/node-sdk"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
