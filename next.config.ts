import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: "/alumni",
        destination: "/alumni/index.html",
      },
      {
        source: "/alumni-ppt",
        destination: "/alumni/index.html",
      },
      {
        source: "/presentation",
        destination: "/alumni/index.html",
      },
      {
        source: "/annual-gala-intro",
        destination: "/annual-gala-intro.html",
      },
      {
        source: "/annual-gala-notice",
        destination: "/annual-gala-notice.html",
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
        source: "/directory-intro",
        destination: "/directory-intro.html",
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
