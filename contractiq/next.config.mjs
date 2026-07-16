/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  webpack: (config) => {
    // pdf-parse uses canvas which isn't needed server-side
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
