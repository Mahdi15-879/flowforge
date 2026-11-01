import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${
          process.env.API_INTERNAL_URL ?? "http://localhost:4000"
        }/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
