import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['https://shipflow-weld.vercel.app/'],
  // Trigger rebuild with new Vercel Root Directory settings
};

export default nextConfig;
