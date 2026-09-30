import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  allowedDevOrigins: ["192.168.1.70"],
};

export default nextConfig;