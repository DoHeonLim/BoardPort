import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/global/providers/ThemeProvider";
import { Toaster } from "sonner";
import AppWrapper from "@/components/global/AppWrapper";
import QueryProvider from "@/components/global/providers/QueryProvider";
import { NotificationStoreProvider } from "@/components/global/providers/NotificationStoreProvider";
import { ModalStoreProvider } from "@/components/global/providers/ModalStoreProvider";
import NotificationBoot from "@/features/notification/components/NotificationBoot";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E40AF",
  colorScheme: "light dark",
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL)
  : new URL("http://localhost:3000"); // 로컬 개발용 폴백

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <AppWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <NotificationStoreProvider>
                <ModalStoreProvider>
                  <Toaster
                    position="top-right"
                    richColors
                    toastOptions={{
                      style: {
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        fontSize: "14px",
                      },
                      classNames: {
                        toast:
                          "group-[.toaster]:bg-surface group-[.toaster]:text-primary group-[.toaster]:shadow-xl",
                        description: "group-[.toast]:text-muted",
                        actionButton:
                          "group-[.toast]:bg-brand group-[.toast]:text-white",
                        cancelButton:
                          "group-[.toast]:bg-surface-dim group-[.toast]:text-muted",
                        closeButton:
                          "group-[.toast]:bg-surface group-[.toast]:border-border group-[.toast]:hover:bg-surface-dim",
                      },
                    }}
                  />

                  <NotificationBoot />

                  {children}
                </ModalStoreProvider>
              </NotificationStoreProvider>
            </QueryProvider>
          </ThemeProvider>
        </AppWrapper>
      </body>
    </html>
  );
}
