import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sil/sdk', '@sil/shared'],
};

export default nextConfig;
