/**
 * File Name : components/ui/Logo.tsx
 * Description : 로고 컴포넌트 (애니메이션 포함)
 * Author : 임도헌
 *
 * History
 * 2024.12.13  임도헌   Created
 * 2024.12.13  임도헌   Modified  로고 컴포넌트 추가
 * 2025.12.10  임도헌   Modified  clsx 추가
 * 2026.01.10  임도헌   Modified  시맨틱 컬러 적용 (다크모드 대응)
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.02.24  임도헌   Modified  심볼(Mobile/Icon)과 텍스트(Desktop/Hero) 로고 분기 처리
 */
"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LOGO_SYMBOL = "/images/logo-symbol.png";
const LOGO_TEXT = "/images/logo-text.png";

interface LogoProps {
  variant?: "full" | "symbol";
  size?: number; // width 기준
  className?: string;
}

export default function Logo({
  variant = "full",
  size,
  className = "",
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
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center justify-center"
      >
        <Image
          src={src}
          alt="BoardPort Logo"
          width={w}
          height={h}
          priority
          className="object-contain"
        />
      </motion.div>

      {isSymbol && (
        <motion.div
          className="absolute inset-0 bg-accent/20 rounded-full blur-xl -z-10"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </div>
  );
}
