import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Uncomment this only for final static production builds
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
