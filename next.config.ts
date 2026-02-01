import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Compress output
  compress: true,
  
  // Generate source maps for production debugging (optional)
  productionBrowserSourceMaps: false,
  
  // Enable Turbopack (Next.js 16 default)
  turbopack: {},
};

export default nextConfig;
