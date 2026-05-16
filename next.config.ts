import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['impers', 'koffi', 'better-sqlite3'],
};

export default nextConfig;
