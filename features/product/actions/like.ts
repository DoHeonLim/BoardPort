/**
 * File Name : features/product/actions/like.ts
 * Description : 좋아요 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.12  임도헌   Created   좋아요 관련 서버 코드 분리
 * 2025.06.08  임도헌   Modified  actions 파일 역할별 분리
 * 2026.01.20  임도헌   Modified  Service(trade) 연동
 * 2026.01.22  임도헌   Modified  Session 전달 방식 수정
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/products/view/[id]/actions/like.ts -> features/product/actions/like.ts
 * 2026.02.05  임도헌   Modified  ServiceResult 처리 및 에러 Throw 추가 (Client 롤백용)
 */
"use server";

import getSession from "@/lib/session";
import { toggleProductLike } from "@/features/product/service/like";

/**
 * 제품 좋아요 추가 Action
 * @throws {Error}
 */
export const likeProduct = async (productId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const res = await toggleProductLike(session.id, productId, true);
  if (!res.success) throw new Error(res.error); // 실패 시 Client가 롤백하도록 에러 던짐
};

/**
 * 제품 좋아요 취소 Action
 * @throws {Error}
 */
export const dislikeProduct = async (productId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const res = await toggleProductLike(session.id, productId, false);
  if (!res.success) throw new Error(res.error);
};
