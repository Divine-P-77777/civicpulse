/** @type {import('next').NextConfig} */
const nextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  // Turbopack is the default in Next.js 16. Declaring an empty config silences
  // the "webpack config but no turbopack config" warning. The fs:false fallback
  // below is only used when Next.js falls back to webpack (e.g. older tooling).
  turbopack: {},

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // If no API URL is configured just skip rewrites
    if (!apiUrl) {
      return [];
    }

    const normalizedApiUrl = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;

    return [
      {
        source: '/api/:path*',
        destination: `${normalizedApiUrl}/api/:path*`,
      },
    ];
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;