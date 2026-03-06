/**
 * File Name : features/user/service/block.ts
 * Description : 유저 차단(Block) 관련 비즈니스 로직 (차단/해제, 관계 확인, 목록 조회)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.04  임도헌   Created   차단/해제 및 상태 확인 로직
 * 2026.02.04  임도헌   Modified  유저간 차단 관계 확인 로직 추가
 * 2026.02.05  임도헌   Modified  차단 시 실시간 'BLOCK' 이벤트 브로드캐스트 추가 (강제 퇴장용)
 * 2026.03.05  임도헌   Modified  차단 처리에 동반되던 광범위한 서버 측 `revalidateTag` 파편화 코드 완전 제거
 * 2026.03.05  임도헌   Modified   주석 최신화
 * 2026.03.07  임도헌   Modified  차단/차단 해제 실패 문구를 구체화(v1.2)
 * 2026.03.07  임도헌   Modified  정지 유저 차단/차단 해제 mutation 가드 추가
 */
import "server-only";

import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { unfollowUserService } from "@/features/user/service/follow";
import { validateUserStatus } from "@/features/user/service/admin";
import type { ServiceResult } from "@/lib/types";

/**
 * 유저를 차단
 *
 * 1. 자기 자신 차단 시도 방어
 * 2. Block 테이블에 레코드 생성 (Upsert로 멱등성 보장)
 * 3. 양방향 팔로우 관계(나->상대, 상대->나)를 즉시 파기
 * 4. `sys_event` (type: BLOCK) 이벤트를 브로드캐스트하여,
 *    상대방이 내 방송이나 채팅방에 접속 중일 경우 즉시 강제 퇴장
 * 5. 나(Blocker)와 상대(Blocked)의 프로필/팔로우 목록 캐시를 무효화
 *
 * @param {number} blockerId - 차단 주체 ID (나)
 * @param {number} blockedId - 차단 대상 ID (상대)
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function blockUserService(
  blockerId: number,
  blockedId: number
): Promise<ServiceResult> {
  try {
    const blockerStatus = await validateUserStatus(blockerId);
    if (!blockerStatus.success) {
      return { success: false, error: blockerStatus.error! };
    }

    if (blockerId === blockedId) {
      return { success: false, error: "자신을 차단할 수 없습니다." };
    }

    // 1. 차단 정보 저장 (Upsert로 중복 방지)
    await db.block.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    });

    // 2. 상호 언팔로우 처리 (Service 직접 호출로 멱등성 보장)
    await Promise.allSettled([
      unfollowUserService(blockerId, blockedId),
      unfollowUserService(blockedId, blockerId),
    ]);

    // 3. 실시간 강제 퇴장 신호 전송 (System Event)
    // 차단 당한 유저(blockedId)의 개인 채널로 'sys_event'를 보냄
    await supabase.channel(`user-${blockedId}-notifications`).send({
      type: "broadcast",
      event: "sys_event",
      payload: {
        type: "BLOCK",
        actorId: blockerId, // 누가 차단했는지 식별
        timestamp: Date.now(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("blockUserService error:", error);
    return {
      success: false,
      error:
        "유저 차단에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 차단을 해제
 *
 * @param {number} blockerId - 차단했던 유저 ID (나)
 * @param {number} blockedId - 차단 풀 유저 ID (상대)
 * @returns {Promise<ServiceResult>} 성공 여부
 */
export async function unblockUserService(
  blockerId: number,
  blockedId: number
): Promise<ServiceResult> {
  try {
    const blockerStatus = await validateUserStatus(blockerId);
    if (!blockerStatus.success) {
      return { success: false, error: blockerStatus.error! };
    }

    await db.block.deleteMany({
      where: {
        blockerId,
        blockedId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("unblockUserService error:", error);
    return {
      success: false,
      error:
        "유저 차단 해제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 나와 차단 관계(내가 차단했거나, 나를 차단한)에 있는 모든 유저 ID 목록을 조회
 *
 * [Mutual Hiding Policy]
 * - 내가 차단한 사람(Blocker=Me): 당연히 안 보여야 함
 * - 나를 차단한 사람(Blocked=Me): 나도 그 사람의 콘텐츠를 볼 수 없어야 함 (상호 차단 효과).
 * - 따라서 OR 조건으로 두 경우를 모두 조회하여 Set으로 병합
 *
 * @param {number} userId - 기준 유저 ID
 * @returns {Promise<number[]>} 차단 관계에 있는 유저 ID 배열
 */
export async function getBlockedUserIds(userId: number): Promise<number[]> {
  const blocks = await db.block.findMany({
    where: {
      OR: [
        { blockerId: userId }, // 내가 차단한 사람
        { blockedId: userId }, // 나를 차단한 사람
      ],
    },
    select: {
      blockerId: true,
      blockedId: true,
    },
  });

  const ids = new Set<number>();
  for (const b of blocks) {
    if (b.blockerId !== userId) ids.add(b.blockerId);
    if (b.blockedId !== userId) ids.add(b.blockedId);
  }
  return Array.from(ids);
}

/**
 * 두 유저 간의 차단 관계 존재 여부를 확인 (양방향).
 * - A가 B를 차단했거나, B가 A를 차단한 경우 모두 `true`를 반환
 * - 상세 페이지 접근 가드(403) 및 상호작용 차단(댓글, 좋아요 등)에서 사용
 *
 * @param {number} userAId - 기준 유저 ID
 * @param {number} userBId - 대상 유저 ID
 * @returns {Promise<boolean>} 차단 관계 존재 여부
 */
export async function checkBlockRelation(
  userAId: number,
  userBId: number
): Promise<boolean> {
  if (userAId === userBId) return false;

  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: userAId, blockedId: userBId }, // A가 B를 차단
        { blockerId: userBId, blockedId: userAId }, // B가 A를 차단
      ],
    },
    select: { id: true },
  });

  return !!block;
}

/**
 * 내가 차단한 유저 목록을 상세 정보(프로필)와 함께 조회
 * - '차단한 선원 관리' 모달에서 사용
 *
 * @param {number} userId - 내 ID
 */
export async function getMyBlockedUsers(userId: number) {
  return await db.block.findMany({
    where: { blockerId: userId },
    select: {
      blocked: {
        select: { id: true, username: true, avatar: true },
      },
    },
    orderBy: { created_at: "desc" }, // 최근 차단한 순서
  });
}
