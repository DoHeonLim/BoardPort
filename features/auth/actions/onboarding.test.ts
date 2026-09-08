/**
 * File Name : features/auth/actions/onboarding.test.ts
 * Description : 인증 직후 온보딩 Action 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.07.30  임도헌   Created   선택 이메일을 생략한 소셜 온보딩 저장 회귀 테스트 추가
 * 2026.07.31  임도헌   Modified  입력한 선택 이메일의 trim·소문자 저장 검증 추가
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAuthOnboardingState: vi.fn(),
  revalidatePath: vi.fn(),
  db: {
    user: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/session", () => ({
  default: mocks.getSession,
}));

vi.mock("@/lib/db", () => ({
  default: mocks.db,
}));

vi.mock("@/features/auth/service/onboarding", () => ({
  getAuthOnboardingState: mocks.getAuthOnboardingState,
}));

describe("completeOnboardingAction", () => {
  const createRequiredLocationFormData = () => {
    const formData = new FormData();

    formData.set("locationName", "서울특별시 강남구");
    formData.set("region1", "서울특별시");
    formData.set("region2", "강남구");
    formData.set("region3", "");
    formData.set("latitude", "37.5172");
    formData.set("longitude", "127.0473");

    return formData;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.getAuthOnboardingState.mockResolvedValue({
      userId: 7,
      username: "kakao_user",
      email: null,
      locationName: null,
      region1: null,
      region2: null,
      region3: null,
      latitude: null,
      longitude: null,
      needsUsernameSetup: false,
      needsEmailSetup: true,
      needsLocationSetup: true,
      needsOnboarding: true,
    });
    mocks.db.user.update.mockResolvedValue({ id: 7 });
  });

  it("선택 이메일 없이 필수 지역 정보만 제출해도 온보딩을 완료한다", async () => {
    const { completeOnboardingAction } = await import("./onboarding");
    const formData = createRequiredLocationFormData();

    const result = await completeOnboardingAction(formData);

    expect(result).toEqual({ success: true });
    expect(mocks.db.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        username: "kakao_user",
        locationName: "서울특별시 강남구",
        region1: "서울특별시",
        region2: "강남구",
        region3: null,
        latitude: 37.5172,
        longitude: 127.0473,
        regionRange: "GU",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(5);
  });

  it("입력한 선택 이메일을 trim·소문자 정규화해 저장한다", async () => {
    const { completeOnboardingAction } = await import("./onboarding");
    const formData = createRequiredLocationFormData();
    formData.set("email", "  User@Example.COM  ");

    const result = await completeOnboardingAction(formData);

    expect(result).toEqual({ success: true });
    expect(mocks.db.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        email: "user@example.com",
        emailVerified: false,
      }),
    });
  });
});
