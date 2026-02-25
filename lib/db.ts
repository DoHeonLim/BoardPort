/**
 * File Name : lib/db.ts
 * Description : 프리즈마 클라이언트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.06  임도헌   Created   프리즈마 클라이언트 생성
 * 2025.11.28  임도헌   Modified  Prisma 7 + adapter-better-sqlite3 적용
 * 2025.11.29  임도헌   Modified  PrismaClient 싱글톤 + DATABASE_URL 기본값 추가
 * 2025.12.20  임도헌   Modified  PostgreSQL(Supabase)용 PrismaPg 어댑터 적용
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7: 모든 DB에 드라이버 어댑터 필수
const adapter = new PrismaPg({
  // Supabase Session Pooler/Postgres URI
  // 예: postgresql://postgres.xxx:password@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?schema=public
  connectionString: process.env.DATABASE_URL!,
});

// 개발 환경에서 HMR로 인한 PrismaClient 인스턴스 중복 생성을 방지하기 위한 싱글톤 패턴
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
