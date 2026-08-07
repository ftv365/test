import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Staging runs behind a preview URL; keep server errors visible rather than
  // swallowed so QA can report real stack traces.
  logging: {
    fetches: { fullUrl: true },
  },
};

export default nextConfig;
