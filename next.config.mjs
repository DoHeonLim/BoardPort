/**
 * File Name : next.config.mjs
 * Description : Next.js 보안 헤더·이미지·Serwist 빌드 설정
 *
 * History
 * 2026.08.23 Modified Next.js 16 및 Serwist 기반 PWA 빌드 구성으로 전환
 * 2026.08.28 Modified TypeScript CLI showConfig 출력 파싱 불안정을 Compiler API 경로로 우회
 * 2026.08.31 Modified 동적 OG 이미지 함수에 Pretendard 한글 글꼴 파일 포함
 * 2026.08.31 Modified 오프라인 안내 페이지의 로고 자산을 Serwist precache에 포함
 */

import withSerwistInit from "@serwist/next";

const pwaRevision = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  register: true,
  scope: "/",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    {
      url: "/offline",
      revision: pwaRevision,
    },
    {
      url: "/images/logo-symbol.png",
      revision: pwaRevision,
    },
    {
      url: "/images/logo-text.png",
      revision: pwaRevision,
    },
  ],
  exclude: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
});

// 환경변수 URL에서 CSP에 넣을 origin만 안전하게 추출
function normalizeOrigin(value) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Supabase HTTPS origin을 Realtime WebSocket origin으로 변환
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

// falsey 값과 중복 출처를 제거해 CSP source list를 안정화
function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

// directive 이름과 source 목록을 CSP 문자열 조각으로 변환
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
  "https://cf.geekdo-images.com",
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
  // next-themes 초기 인라인 스크립트 가능성을 고려해 Report-Only 정책에서는 유지
  buildDirective("style-src", ["'self'", "'unsafe-inline'"]),
  // Next/App Router 초기 inline payload와 next-themes bootstrap을 고려해 Report-Only 정책에서는 유지
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

// Vercel custom domain 기본 Strict-Transport-Security: max-age=63072000 제공
// 운영 HSTS는 앱 헤더가 아니라 플랫폼 계층에서 관리

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/products/view/*/opengraph-image*": [
      "./app/fonts/Pretendard-Bold.subset.woff2",
    ],
    "/products/view/*/og-image": ["./app/fonts/Pretendard-Bold.subset.woff2"],
    "/posts/*/opengraph-image*": ["./app/fonts/Pretendard-Bold.subset.woff2"],
    "/posts/*/og-image": ["./app/fonts/Pretendard-Bold.subset.woff2"],
    "/streams/*/opengraph-image*": ["./app/fonts/Pretendard-Bold.subset.woff2"],
    "/streams/*/og-image": ["./app/fonts/Pretendard-Bold.subset.woff2"],
  },
  experimental: {
    // Next 16 CLI 경로가 큰 --showConfig 출력을 잘린 JSON으로 읽는 경우가 있어
    // 타입 검사를 생략하지 않고 현재 TypeScript 5.9 Compiler API로 실행한다.
    useTypeScriptCli: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "**",
      },
      { hostname: "cf.geekdo-images.com" },
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

export default withSerwist(nextConfig);
