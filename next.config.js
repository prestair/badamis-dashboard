/** @type {import('next').NextConfig} */

// Build-time app version — used by VersionRefresh to force every client to pick
// up a fresh build automatically after each deploy. On Vercel this is the unique
// git commit SHA of the deployment (changes on EVERY push, no manual work needed).
// Locally it falls back to a build timestamp so dev builds still work.
const APP_BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  String(Date.now());

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
  env: {
    // Exposed to the browser bundle as process.env.NEXT_PUBLIC_APP_BUILD_ID
    NEXT_PUBLIC_APP_BUILD_ID: APP_BUILD_ID,
  },
};

module.exports = nextConfig;
