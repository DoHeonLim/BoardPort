import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "**",
      },
      { hostname: "imagedelivery.net" },
      { hostname: "w7.pngwing.com" },
      { hostname: "customer-fllme7un34f7981k.cloudflarestream.com" },
      { hostname: "videodelivery.net" },
    ],
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  importScripts: ["/pwa-push.js"],
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
  scope: "/",
  fallbacks: { document: "/offline" },
})(nextConfig);
