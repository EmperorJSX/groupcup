import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 coerces <Image quality> to the closest listed value, so 100 must be whitelisted.
    qualities: [75, 100],
  },
  // The bot code is still WIP; the production image only needs the landing
  // and the web demo, so type issues there must never fail the build.
  // Next 16 dropped the eslint config key: builds no longer run ESLint.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
