import type { NextConfig } from "next";

const nextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vtceiucueeyibjopzfem.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
