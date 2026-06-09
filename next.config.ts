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

  // Tree-shake barrel imports from large packages to shrink the client bundle
  experimental: {
    optimizePackageImports: ['recharts', '@mui/icons-material', 'lucide-react'],
  },
};

export default nextConfig;
