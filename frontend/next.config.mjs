/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow an alternate build dir (e.g. for verifying a prod build while
  // `next dev` holds the default .next). Defaults to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
