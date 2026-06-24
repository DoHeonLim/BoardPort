/**
 * File Name : features/post/schemas.test.ts
 * Description : 게시글 폼 스키마 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   게시글 작성/수정 입력 검증 회귀 테스트 추가
 */

import { describe, expect, test } from "vitest";
import { postFormSchema } from "@/features/post/schemas";

describe("postFormSchema", () => {
  test("제목, 카테고리, 텍스트 블록이 있으면 유효하다", () => {
    const result = postFormSchema.safeParse({
      title: "[E2E] 게시글 스키마 테스트",
      category: "FREE",
      description: "게시글 본문입니다.",
      tags: [],
      boardGameIds: [],
      photos: [],
      photosAnimated: [],
      blocks: [
        {
          id: "text-1",
          type: "TEXT",
          textContent: "게시글 본문입니다.",
        },
      ],
      location: null,
    });

    expect(result.success).toBe(true);
  });

  test("본문과 미디어가 모두 비어 있으면 실패한다", () => {
    const result = postFormSchema.safeParse({
      title: "[E2E] 게시글 스키마 테스트",
      category: "FREE",
      description: "",
      tags: [],
      boardGameIds: [],
      photos: [],
      photosAnimated: [],
      blocks: [],
      location: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.description).toContain(
        "내용이나 미디어를 추가해주세요."
      );
    }
  });

  test("지원하지 않는 카테고리는 실패한다", () => {
    const result = postFormSchema.safeParse({
      title: "[E2E] 게시글 스키마 테스트",
      category: "UNKNOWN",
      description: "게시글 본문입니다.",
      tags: [],
      boardGameIds: [],
      photos: [],
      photosAnimated: [],
      blocks: [
        {
          id: "text-1",
          type: "TEXT",
          textContent: "게시글 본문입니다.",
        },
      ],
      location: null,
    });

    expect(result.success).toBe(false);
  });
});
