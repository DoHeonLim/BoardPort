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
      { hostname: "i.ytimg.com" },
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
  // 푸시/오프라인 보조 스크립트는 서비스 워커가 설치될 때 함께 주입
  importScripts: ["/pwa-push.js"],
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
  scope: "/",
  fallbacks: { document: "/offline" },
})(nextConfig);
