import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  output: isProduction ? "standalone" : undefined,
  allowedDevOrigins: ["192.168.1.106"],
};

export default nextConfig;
