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
 * 2026.05.19  임도헌   Modified  Prisma Client가 클라이언트 번들에 포함되지 않도록 server-only 가드 추가
 * 2026.08.28  임도헌   Modified  PrismaPg 런타임 Pool 연결 수·timeout 명시 및 환경변수 검증 추가
 */

import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabasePoolConfig, getDatabaseUrl } from "@/lib/env";

// Prisma 7: 모든 DB에 드라이버 어댑터 필수
const adapter = new PrismaPg({
  // Vercel 런타임은 Supabase transaction pooler URL을 사용한다. Prisma URL의
  // connection_limit은 pg.Pool max가 아니므로 node-postgres 옵션을 별도로 전달한다.
  connectionString: getDatabaseUrl(),
  ...getDatabasePoolConfig(),
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
