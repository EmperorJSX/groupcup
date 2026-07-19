import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 coerces <Image quality> to the closest listed value, so 100 must be whitelisted.
    qualities: [75, 100],
  },
};

export default nextConfig;
