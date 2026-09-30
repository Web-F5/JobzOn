import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Supplier price list CSVs regularly exceed the 1 MB default.
      // Kept under Vercel's 4.5 MB request body cap.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
