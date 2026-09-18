import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Lets the dev server (npm run dev) accept requests from your phone when
  // you open it via your PC's LAN IP (e.g. http://192.168.254.124:3000).
  // Without this, Next.js blocks some of its own dev-only traffic (like
  // live-reload) from any origin other than localhost — this doesn't affect
  // the deployed Vercel site at all, only local testing from another device.
  allowedDevOrigins: ["192.168.254.124"],
};

export default nextConfig;
