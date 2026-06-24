/**
 * File Name : features/product/schemas.test.ts
 * Description : 상품 폼 스키마 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   상품 등록/수정 입력 검증 회귀 테스트 추가
 * 2026.06.18  임도헌   Modified  거래 기준 지역 필수화 검증 추가
 */

import { describe, expect, test } from "vitest";
import { productFormSchema } from "@/features/product/schemas";

const validProductInput = {
  title: "[E2E] 상품 스키마 테스트",
  description: "상품 설명입니다.",
  price: 12000,
  photos: ["https://example.com/product.png"],
  photosAnimated: [false],
  game_type: "BOARD_GAME",
  min_players: 2,
  max_players: 4,
  play_time: "30분",
  condition: "GOOD",
  completeness: "PERFECT",
  has_manual: true,
  categoryId: 1,
  boardGameIds: [],
  tags: [],
  location: {
    latitude: 37.5665,
    longitude: 126.978,
    locationName: "서울시청",
    region1: "서울",
    region2: "중구",
    region3: "태평로1가",
  },
};

describe("productFormSchema", () => {
  test("필수 상품 정보와 이미지가 있으면 유효하다", () => {
    const result = productFormSchema.safeParse(validProductInput);

    expect(result.success).toBe(true);
  });

  test("이미지가 없으면 실패한다", () => {
    const result = productFormSchema.safeParse({
      ...validProductInput,
      photos: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.photos).toContain(
        "최소 1개 이상의 이미지를 업로드해주세요."
      );
    }
  });

  test("최대 인원이 최소 인원보다 작으면 실패한다", () => {
    const result = productFormSchema.safeParse({
      ...validProductInput,
      min_players: 4,
      max_players: 2,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.max_players).toContain(
        "최대 인원은 최소 인원 이상이어야 합니다."
      );
    }
  });

  test("거래 기준 지역이 없으면 실패한다", () => {
    const result = productFormSchema.safeParse({
      ...validProductInput,
      location: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.location).toContain(
        "거래 기준 지역을 선택해주세요."
      );
    }
  });
});
