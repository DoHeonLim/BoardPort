/**
 * File Name : features/user/selects.ts
 * Description : 유저 도메인 Prisma select 모음
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.16  임도헌   Created   유저 도메인 공용 select를 service 외부로 분리
 */

import type { Prisma } from "@/generated/prisma/client";

/** 유저 경량 정보 select */
export const USER_LITE_SELECT = {
  id: true,
  username: true,
  avatar: true,
} satisfies Prisma.UserSelect;

/** 관리자 유저 목록 item select */
export const ADMIN_USER_ITEM_SELECT = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  role: true,
  bannedAt: true,
  created_at: true,
  _count: {
    select: {
      posts: true,
      products: true,
      reports_received: true,
    },
  },
} satisfies Prisma.UserSelect;

/** 프로필 후기 목록 select */
export const PROFILE_REVIEW_SELECT = {
  id: true,
  created_at: true,
  rate: true,
  payload: true,
  user: { select: USER_LITE_SELECT },
  product: {
    select: { id: true, title: true, userId: true, purchase_userId: true },
  },
} satisfies Prisma.ReviewSelect;
