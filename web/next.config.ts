import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep module resolution scoped to the web app when multiple lockfiles exist.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
