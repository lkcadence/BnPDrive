import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  async headers() {
    return [
      {
        source: '/driver/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, private' }],
      },
      {
        source: '/api/driver/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, private' }],
      },
    ];
  },
};

export default nextConfig;
