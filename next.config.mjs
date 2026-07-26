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
  serverExternalPackages: ["pg"],
  turbopack: {},
};

export default nextConfig;
