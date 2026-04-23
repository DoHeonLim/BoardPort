import withPWA from "next-pwa";

const isProduction = process.env.NODE_ENV === "production";

function normalizeOrigin(value) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function toWebSocketOrigin(origin) {
  if (!origin) return null;

  try {
    const url = new URL(origin);
    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildDirective(name, sources) {
  return `${name} ${sources.join(" ")}`;
}

const appOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
const supabaseOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseWsOrigin = toWebSocketOrigin(supabaseOrigin);
const cloudflareStreamOrigin = normalizeOrigin(
  process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN
);
const kakaoMapsOrigin = "https://dapi.kakao.com";

const isSecureAppOrigin = (() => {
  if (!appOrigin) return false;

  try {
    return new URL(appOrigin).protocol === "https:";
  } catch {
    return false;
  }
})();

const imageOrigins = unique([
  "https://avatars.githubusercontent.com",
  "https://imagedelivery.net",
  "https://w7.pngwing.com",
  "https://i.ytimg.com",
  "https://customer-fllme7un34f7981k.cloudflarestream.com",
  "https://videodelivery.net",
  cloudflareStreamOrigin,
]);

const scriptOrigins = unique([kakaoMapsOrigin]);
const connectOrigins = unique([
  supabaseOrigin,
  supabaseWsOrigin,
  kakaoMapsOrigin,
]);
const frameOrigins = unique([
  "https://www.youtube-nocookie.com",
  cloudflareStreamOrigin,
]);
const mediaOrigins = unique([cloudflareStreamOrigin]);

const cspReportOnly = [
  buildDirective("default-src", ["'self'"]),
  buildDirective("base-uri", ["'self'"]),
  buildDirective("form-action", ["'self'"]),
  buildDirective("object-src", ["'none'"]),
  buildDirective("frame-ancestors", ["'self'"]),
  buildDirective("img-src", ["'self'", "data:", "blob:", ...imageOrigins]),
  buildDirective("font-src", ["'self'", "data:"]),
  // next-themes 초기 인라인 스크립트 가능성을 고려한 1차 관찰용 임시 허용값
  buildDirective("style-src", ["'self'", "'unsafe-inline'"]),
  // Report-Only 관찰 단계에서는 인라인 스크립트를 임시 허용하고 2차에서 축소를 검토
  buildDirective("script-src", ["'self'", "'unsafe-inline'", ...scriptOrigins]),
  buildDirective("connect-src", ["'self'", ...connectOrigins]),
  buildDirective("frame-src", ["'self'", ...frameOrigins]),
  buildDirective("worker-src", ["'self'", "blob:"]),
  buildDirective("manifest-src", ["'self'"]),
  buildDirective("media-src", ["'self'", "blob:", ...mediaOrigins]),
].join("; ");

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: cspReportOnly,
  },
  {
    key: "Permissions-Policy",
    value:
      "geolocation=(), camera=(), microphone=(), payment=(), usb=(), browsing-topics=()",
  },
];

if (isProduction && isSecureAppOrigin) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=86400",
  });
}

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
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
