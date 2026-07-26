/** @type {import('next').NextConfig} */
const isTauri = process.env.TAURI === "1" || process.env.TAURI === "true";

const nextConfig = {
  reactStrictMode: true,
  output: isTauri ? "export" : "standalone",
  trailingSlash: isTauri,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  turbopack: {
    // Prevent a parent-directory package-lock.json from being selected as the
    // workspace root (common when the repo lives under Downloads on Windows).
    root: process.cwd(),
  },
};

export default nextConfig;
