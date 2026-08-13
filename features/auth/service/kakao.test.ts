/**
 * File Name : features/auth/service/kakao.test.ts
 * Description : 카카오 OAuth 유저 생성 이메일 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.07.31  임도헌   Created   카카오 선택 이메일 동의·유효성·정규화 테스트 추가
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  default: mocks.db,
}));

describe("findOrCreateKakaoUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.user.findUnique.mockResolvedValue(null);
    mocks.db.user.create.mockResolvedValue({ id: 11 });
  });

  it("동의 완료된 유효 이메일을 trim·소문자 정규화해 저장한다", async () => {
    const { findOrCreateKakaoUser } = await import("./kakao");

    const userId = await findOrCreateKakaoUser({
      id: 12345,
      kakao_account: {
        email: "  User@Example.COM  ",
        email_needs_agreement: false,
        is_email_valid: true,
        is_email_verified: true,
        profile: {
          nickname: "Ryan",
          is_default_image: true,
        },
      },
    });

    expect(userId).toBe(11);
    expect(mocks.db.user.create).toHaveBeenCalledWith({
      data: {
        username: "ryan-kk",
        kakao_id: "12345",
        avatar: null,
        email: "user@example.com",
        emailVerified: false,
      },
      select: { id: true },
    });
  });

  it.each([
    {
      label: "추가 동의가 필요한",
      email_needs_agreement: true,
      is_email_valid: true,
    },
    {
      label: "유효하지 않은",
      email_needs_agreement: false,
      is_email_valid: false,
    },
  ])(
    "$label 카카오 이메일은 저장하지 않는다",
    async ({ email_needs_agreement, is_email_valid }) => {
      const { findOrCreateKakaoUser } = await import("./kakao");

      await findOrCreateKakaoUser({
        id: 12345,
        kakao_account: {
          email: "user@example.com",
          email_needs_agreement,
          is_email_valid,
          is_email_verified: false,
          profile: { nickname: "Ryan" },
        },
      });

      expect(mocks.db.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: null,
          emailVerified: false,
        }),
        select: { id: true },
      });
    }
  );
});
