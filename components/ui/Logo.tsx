/**
 * File Name : components/ui/Logo.tsx
 * Description : 로고 컴포넌트
 * Author : 임도헌
 *
 * History
 * 2024.12.13  임도헌   Created
 * 2024.12.13  임도헌   Modified  로고 컴포넌트 추가
 * 2025.12.10  임도헌   Modified  clsx 추가
 * 2026.01.10  임도헌   Modified  시맨틱 컬러 적용 (다크모드 대응)
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.02.24  임도헌   Modified  심볼(Mobile/Icon)과 텍스트(Desktop/Hero) 로고 분기 처리
 * 2026.03.08  임도헌   Modified  framer-motion 기반 장식 애니메이션 제거
 * 2026.04.04  임도헌   Modified  export 주석을 보강해 심볼/텍스트 로고 분기 사용 의도를 더 명확히 정리
 * 2026.04.12  임도헌   Modified  랜딩 LCP 최적화를 위해 priority/sizes/unoptimized를 호출부에서 제어 가능하도록 확장
 * 2026.04.12  임도헌   Modified  히어로 단일 responsive 로고를 위해 fluid/imageClassName 옵션 추가
 */
import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SYMBOL = "/images/logo-symbol.png";
const LOGO_TEXT = "/images/logo-text.png";

interface LogoProps {
  variant?: "full" | "symbol";
  size?: number; // width 기준
  className?: string;
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
  quality?: number;
  fluid?: boolean;
  imageClassName?: string;
}

/**
 * BoardPort 심볼/텍스트 로고를 상황에 맞게 렌더링하는 공용 브랜딩 컴포넌트
 *
 * - 심볼/텍스트 로고 분기
 * - 명시적 width/height 기반 CLS 방지
 * - 모바일 아이콘과 데스크톱 히어로 로고의 같은 자산 규칙 유지
 *
 * @param {LogoProps} props - 로고 variant, 크기, 컨테이너 스타일 설정
 * @returns {JSX.Element} BoardPort 로고
 */
export default function Logo({
  variant = "full",
  size,
  className = "",
  priority = false,
  sizes,
  unoptimized = false,
  quality,
  fluid = false,
  imageClassName = "",
}: LogoProps) {
  const isSymbol = variant === "symbol";
  const src = isSymbol ? LOGO_SYMBOL : LOGO_TEXT;

  // fill 대신 명시적 픽셀을 주입하여 CLS 완벽 방지
  const w = size || (isSymbol ? 48 : 160);
  const h = size ? (isSymbol ? size : size / 2.5) : 48;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        className
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center",
          fluid && "w-full"
        )}
      >
        <Image
          src={src}
          alt="BoardPort Logo"
          width={w}
          height={h}
          priority={priority}
          sizes={sizes}
          unoptimized={unoptimized}
          quality={quality}
          className={cn(
            "object-contain",
            fluid && "h-auto w-full",
            imageClassName
          )}
        />
      </div>
    </div>
  );
}
