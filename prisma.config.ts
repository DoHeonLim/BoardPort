/**
 * File Name : prisma.config
 * Description : Prisma CLI 설정 파일 (Prisma 7용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.28  임도헌   Created   Prisma 7 orm 설정 도입 (schema/migrations/datasource)
 */

import dotenv from "dotenv";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// 1) 기본 .env 먼저 로드 (있으면)
dotenv.config({ path: path.join(process.cwd(), ".env") });
// 2) 그 다음 .env.local로 덮어쓰기
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  // Prisma 스키마 경로
  schema: path.join("prisma", "schema.prisma"),

  // 마이그레이션 & seed 설정
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },

  // DB 연결 (PostgreSQL / Supabase)
  datasource: {
    // Prisma CLI(마이그레이션/스튜디오/인스펙트)는 direct 연결이 안정적
    url: env("DIRECT_URL"),
  },
});
