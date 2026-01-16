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
 */
"use client";
import Image from "next/image";
import logo from "@/public/images/logo.svg";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "symbol";
  size?: number;
  className?: string;
}

export default function Logo({
  variant = "full",
  size,
  className = "",
}: LogoProps) {
  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* 로고 이미지 컨테이너 */}
      <div
        className={cn("relative", !size && "w-40 h-40 sm:w-56 sm:h-56")}
        style={size ? { width: size, height: size } : undefined}
      >
        {/* 빛나는 효과 (로고 뒤에) - 브랜드 컬러 활용 */}
        <motion.div
          className="absolute inset-0 bg-accent/30 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* 로고 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            rotate: [0, -3, 3, -3, 0],
          }}
          transition={{
            duration: 0.8,
            rotate: {
              duration: 2,
              delay: 0.8,
              ease: "easeInOut",
            },
          }}
          className="relative w-full h-full"
        >
          <Image
            src={logo}
            alt="보드포트"
            fill
            priority
            className="object-contain z-10"
          />
        </motion.div>

        {/* 추가 빛나는 효과 (로고 앞에) */}
        <motion.div
          className="absolute inset-0 bg-white/40 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      </div>

      {variant === "full" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 1,
          }}
          className="mt-4 text-center"
        >
          {/* 텍스트: 흰색 배경/다크 배경 모두 고려하여 text-primary 대신 명시적 색상 사용 가능하나, 여기서는 배경(Gradient) 위이므로 white 유지 */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
            보드포트
          </h1>
          <p className="text-base sm:text-lg text-white/90 mt-1 font-medium">
            모든 게임이 모이는 곳
          </p>
        </motion.div>
      )}
    </div>
  );
}
