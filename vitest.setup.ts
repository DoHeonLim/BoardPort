/**
 * File Name : vitest.setup.ts
 * Description : Vitest 공용 DOM matcher와 React 테스트 정리 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.28  임도헌   Created   jest-dom matcher와 테스트별 React DOM cleanup 등록
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
