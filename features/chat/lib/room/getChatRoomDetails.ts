/**
 * File Name : features/chat/lib/room/getChatRoomDetails.ts
 * Description : 해당 채팅방 제품 상세 정보 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   제품 상세 정보 조회 로직 분리
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

import db from "@/lib/db";

/**
 * getChatRoomDetails
 * - 채팅방 상단에 표시할 제품의 요약 정보를 조회
 * - 대표 이미지(order: 0)만 가져옴
 *
 * productId - 조회할 제품 ID
 * @returns 제품 ID, 제목, 가격, 대표 이미지, 유저 ID, 구매자/예약자 정보 등
 */
export const getChatRoomDetails = async (productId: number) => {
  return db.product.findUnique({
    where: { id: productId },
    select: {
      id: true, // 제품 ID
      title: true, // 제품 제목
      price: true, // 가격
      images: {
        where: { order: 0 }, // 대표 이미지 (order: 0)
        select: { url: true },
        take: 1,
      },
      userId: true, // 제품 등록자
      purchase_userId: true, // 구매자 (거래 완료 여부)
      reservation_userId: true, // 예약자
    },
  });
};
