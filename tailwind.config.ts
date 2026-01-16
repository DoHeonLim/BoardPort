// 2024.11.23  임도헌 tailwind 스크롤 바 커스텀
// 2026.01.10  임도헌 BoardPort Design Standard v1.1 적용

import type { Config } from "tailwindcss";
import formsPlugin from "@tailwindcss/forms";
import scrollbarPlugin from "tailwind-scrollbar";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // [Rule 5.2] 색상 역할 정의 (Color Roles)
        background: {
          DEFAULT: "var(--background)", // 페이지 전체 배경
          dark: "var(--background-dark)",
        },
        surface: {
          DEFAULT: "var(--surface)", // 카드, 모달, 패널 배경
          foreground: "var(--surface-foreground)", // 표면 위 텍스트
          dim: "var(--surface-dim)", // 약간 어두운/밝은 표면 구분
        },

        // 브랜드 아이덴티티: Deep Blue (기존 primary 색상 계승)
        brand: {
          DEFAULT: "#1E3A8A", // blue-900 (Main)
          light: "#3B82F6", // blue-500 (Interactive)
          dark: "#172554", // blue-950 (Deep)
        },

        // 텍스트 색상 (v1.1 표준)
        primary: {
          DEFAULT: "var(--text-primary)", // 본문 중요 텍스트
        },
        muted: {
          DEFAULT: "var(--text-muted)", // 보조 텍스트
        },

        // 의미론적 역할 (Semantic Roles)
        accent: {
          DEFAULT: "#FCD34D", // amber-300 (CTA/강조) - 기존 유지
          light: "#FDE68A",
          dark: "#F59E0B",
          foreground: "#78350F",
        },
        danger: {
          DEFAULT: "#EF4444", // red-500 (삭제/경고)
        },
        border: "var(--border)", // 경계선

        // 기존 색상 호환성 유지 (점진적 리팩토링을 위해 남겨둠)
        secondary: {
          DEFAULT: "#60A5FA",
          light: "#93C5FD",
          dark: "#3B82F6",
        },
        badge: {
          DEFAULT: "var(--badge-bg)",
          text: "var(--badge-text)",
        },
      },
      borderRadius: {
        // [Rule 5.3] 둥글기 일관성
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      // [Rule 3.2] 데스크톱 제약 조건 헬퍼
      maxWidth: {
        mobile: "640px",
      },
      // [Rule 5.1]높이/너비에 대한 Semantic Token 추가
      height: {
        "input-sm": "2.5rem", // 40px (Small Input/Button)
        "input-md": "3rem", // 48px (Default Input/Button - Touch Target Base)
        "input-lg": "3.5rem", // 56px (Large Action)
        "bar-bottom": "60px", // TabBar Height
      },
      minHeight: {
        "touch-target": "44px", // [Rule 3.2] Minimum Touch Target
      },
      // [Rule 5.1] 간격(Spacing)에 대한 Semantic Token (선택 사항이나 권장)
      spacing: {
        "page-x": "1.5rem", // px-6 (Page horizontal padding)
        "page-y": "2.5rem", // py-10 (Page vertical padding)
        "form-gap": "1.25rem", // gap-5 (Between form fields)
      },
      // 애니메이션 (기존 애니메이션 + 신규 추가)
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 3s ease-in-out infinite", // 기존 float 애니메이션 유지
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        float: {
          // 기존 float 키프레임 유지
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [formsPlugin, scrollbarPlugin({ nocompatible: true })],
};
export default config;
