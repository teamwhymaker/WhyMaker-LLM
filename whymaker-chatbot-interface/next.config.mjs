/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Avoid bundling heavy native dependencies into server components at build time
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
}

export default nextConfig
