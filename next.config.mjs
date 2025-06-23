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
  // Updated for Next.js 15 - moved from experimental.serverComponentsExternalPackages
  serverExternalPackages: [
    'cheerio',
    '@neondatabase/serverless',
    'node:fs',
    'node:path'
  ],
  // Add webpack configuration to handle server-side packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure externals is always an array
      const externals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : []

      // Prevent webpack from bundling Node-core modules
      for (const mod of ['fs', 'path', 'net', 'tls']) {
        if (!externals.includes(mod)) externals.push(mod)
      }

      config.externals = externals
    }
    return config
  },
  // Ensure proper handling of API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
}

export default nextConfig
