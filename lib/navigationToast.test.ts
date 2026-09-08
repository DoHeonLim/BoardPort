/**
 * File Name : lib/navigationToast.test.ts
 * Description : 화면 전환 성공 토스트 전달 유틸 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.24  임도헌   Created   목적 경로·단발 소비·만료·손상 데이터 경계 검증 추가
 */

import { describe, expect, it } from "vitest";
import {
  consumeNavigationSuccessToast,
  markNavigationSuccessToast,
  type NavigationToastStorage,
} from "./navigationToast";

function createStorage(): NavigationToastStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("navigation success toast", () => {
  it("목적 경로에서 메시지를 한 번만 소비한다", () => {
    const storage = createStorage();
    markNavigationSuccessToast(
      "/products/view/1",
      "상품 정보가 수정되었습니다.",
      storage,
      1_000
    );

    expect(
      consumeNavigationSuccessToast("/products/view/1", storage, 2_000)
    ).toBe("상품 정보가 수정되었습니다.");
    expect(
      consumeNavigationSuccessToast("/products/view/1", storage, 2_000)
    ).toBeNull();
  });

  it("중간 경로에서는 소비하지 않고 목적 경로까지 유지한다", () => {
    const storage = createStorage();
    markNavigationSuccessToast(
      "/products/view/1",
      "상품 정보가 수정되었습니다.",
      storage,
      1_000
    );

    expect(
      consumeNavigationSuccessToast("/products", storage, 2_000)
    ).toBeNull();
    expect(
      consumeNavigationSuccessToast("/products/view/1", storage, 2_000)
    ).toBe("상품 정보가 수정되었습니다.");
  });

  it("만료되거나 손상된 메시지는 제거한다", () => {
    const expiredStorage = createStorage();
    markNavigationSuccessToast(
      "/products/view/1",
      "상품 정보가 수정되었습니다.",
      expiredStorage,
      1_000
    );
    expect(
      consumeNavigationSuccessToast("/products/view/1", expiredStorage, 31_001)
    ).toBeNull();

    const invalidStorage = createStorage();
    invalidStorage.setItem("boardport-navigation-success-toast", "invalid");
    expect(
      consumeNavigationSuccessToast("/products/view/1", invalidStorage, 2_000)
    ).toBeNull();
  });
});
