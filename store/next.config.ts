import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  images: { dangerouslyAllowSVG: true, contentDispositionType: 'attachment' },
};
export default nextConfig;
