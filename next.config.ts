import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: "/annual-gala-intro",
        destination: "/annual-gala-intro.html",
      },
      {
        source: "/annual-gala-sponsorship",
        destination: "/annual-gala-sponsorship.html",
      },
      {
        source: "/alumni-intro",
        destination: "/alumni-intro.html",
      },
      {
        source: "/jobs-intro",
        destination: "/jobs-intro.html",
      },
      {
        source: "/matchmaking-intro",
        destination: "/matchmaking-intro.html",
      },
      {
        source: "/cockpit-intro",
        destination: "/cockpit-intro.html",
      },
    ];
  },
};

export default nextConfig;
