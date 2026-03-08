import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // output: 'standalone', // disabled — breaks CSS serving without custom server
  devIndicators: false,
  allowedDevOrigins: ['gembots.space', 'https://gembots.space'],
  // outputFileTracingRoot: __dirname,
  experimental: {
  },
};

export default nextConfig;
