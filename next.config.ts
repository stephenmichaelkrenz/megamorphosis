import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/lander",
        destination: "/",
        permanent: false,
      },
      {
        source: "/lander/:path*",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
