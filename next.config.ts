import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for camera/gyroscope APIs on mobile
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Permissions-Policy", value: "camera=*, gyroscope=*" },
        ],
      },
    ];
  },
};

export default nextConfig;
