/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint runs separately in CI — skip during next build to prevent false failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors are caught locally — ignore during Vercel build
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
