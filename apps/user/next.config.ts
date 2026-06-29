import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // SSR (deployed to Cloudflare Workers via @opennextjs/cloudflare) so per-session
  // routes like /s/[code] resolve at request time without static-export limits.
  transpilePackages: ['@commentoo/ui', '@commentoo/realtime', '@commentoo/shared'],
};

export default nextConfig;
