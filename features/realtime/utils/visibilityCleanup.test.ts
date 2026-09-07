/**
 * File Name : features/realtime/utils/visibilityCleanup.test.ts
 * Description : Realtime 백그라운드 정리 스케줄러 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.31  임도헌   Created   짧은 화면 전환 취소와 장기 hidden·문서 이탈 정리 검증
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createRealtimeVisibilityCleanup } from "./visibilityCleanup";

describe("createRealtimeVisibilityCleanup", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("지연 시간 전에 화면으로 복귀하면 채널 정리를 취소한다", () => {
    vi.useFakeTimers();
    const cleanup = vi.fn();
    const lifecycle = createRealtimeVisibilityCleanup(cleanup, 30_000);

    lifecycle.schedule();
    vi.advanceTimersByTime(5_000);
    lifecycle.cancel();
    vi.advanceTimersByTime(30_000);

    expect(cleanup).not.toHaveBeenCalled();
  });

  it("hidden 상태가 지연 시간보다 길면 채널을 한 번 정리한다", () => {
    vi.useFakeTimers();
    const cleanup = vi.fn();
    const lifecycle = createRealtimeVisibilityCleanup(cleanup, 30_000);

    lifecycle.schedule();
    lifecycle.schedule();
    vi.advanceTimersByTime(30_000);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("문서 이탈 시 예약을 취소하고 채널을 즉시 정리한다", () => {
    vi.useFakeTimers();
    const cleanup = vi.fn();
    const lifecycle = createRealtimeVisibilityCleanup(cleanup, 30_000);

    lifecycle.schedule();
    lifecycle.flush();
    vi.advanceTimersByTime(30_000);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
