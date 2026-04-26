import withPWA from "next-pwa";

// 환경변수 URL에서 CSP에 넣을 origin만 안전하게 추출한다.
function normalizeOrigin(value) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Supabase HTTPS origin을 Realtime WebSocket origin으로 변환한다.
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

// falsey 값과 중복 출처를 제거해 CSP source list를 안정화한다.
function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

// directive 이름과 source 목록을 CSP 문자열 조각으로 만든다.
function buildDirective(name, sources) {
  return `${name} ${sources.join(" ")}`;
}

const supabaseOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseWsOrigin = toWebSocketOrigin(supabaseOrigin);
const cloudflareStreamOrigin = normalizeOrigin(
  process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN
);
const kakaoMapsOrigin = "https://dapi.kakao.com";

const imageOrigins = unique([
  "https://avatars.githubusercontent.com",
  "https://imagedelivery.net",
  "https://w7.pngwing.com",
  "https://i.ytimg.com",
  "https://mts.daumcdn.net",
  "https://t1.daumcdn.net",
  "https://customer-fllme7un34f7981k.cloudflarestream.com",
  "https://videodelivery.net",
  cloudflareStreamOrigin,
]);

const scriptOrigins = unique([kakaoMapsOrigin, "https://t1.daumcdn.net"]);
const connectOrigins = unique([
  supabaseOrigin,
  supabaseWsOrigin,
  kakaoMapsOrigin,
  "https://t1.daumcdn.net",
  "https://mts.daumcdn.net",
  "https://imagedelivery.net",
  "https://upload.imagedelivery.net",
  "https://upload.cloudflarestream.com",
  "https://i.ytimg.com",
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
  // next-themes 초기 인라인 스크립트 가능성을 고려해 Report-Only 정책에서는 유지한다.
  buildDirective("style-src", ["'self'", "'unsafe-inline'"]),
  // Next/App Router 초기 inline payload와 next-themes bootstrap을 고려해 Report-Only 정책에서는 유지한다.
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

// Vercel custom domain은 기본으로 Strict-Transport-Security: max-age=63072000을 내려준다.
// 운영 HSTS는 앱 헤더가 아니라 플랫폼 계층에서 관리한다.

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
