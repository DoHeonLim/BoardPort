/**
 * File Name : app/layout.tsx
 * Description : 앱 공통 루트 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.12  임도헌   Created   라우트 그룹 개편에 맞춰 공통 루트 레이아웃만 유지하도록 구조 분리
 * 2026.05.30  임도헌   Modified  PWA 상태표시줄 색상을 라이트/다크 테마 기준으로 분리
 * 2026.08.23  임도헌   Modified  metadata base URL을 공용 trusted origin 검증으로 통합
 */
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getTrustedAppBaseUrl } from "@/lib/env";
import "./globals.css";

const pretendardSubset = localFont({
  src: [
    {
      path: "./fonts/Pretendard-Regular.subset.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Pretendard-Bold.subset.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  variable: "--font-pretendard-subset",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  colorScheme: "light dark",
};

const baseUrl = new URL(getTrustedAppBaseUrl());

export const metadata: Metadata = {
  metadataBase: baseUrl,
  title: {
    template: "%s | 보드포트",
    default: "보드포트 - 모든 게임이 모이는 곳",
  },
  description: "보드게임과 TRPG 중고거래 및 커뮤니티 플랫폼 보드포트입니다.",
  icons: {
    icon: "/favicon.ico",
    apple: "/images/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "보드포트",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={pretendardSubset.variable}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
