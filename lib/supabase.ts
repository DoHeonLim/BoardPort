/**
 * File Name : lib/supabase.ts
 * Description : 세션 JWT로 private 채널만 구독하는 브라우저 Supabase 클라이언트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.19  임도헌   Created
 * 2024.12.19  임도헌   Modified  supabase 클라이언트 코드 분리
 * 2026.08.21  임도헌   Modified  단기 JWT 주입과 private 채널 구독 준비 경계 추가
 * 2026.08.22  임도헌   Modified  Realtime heartbeat의 반복 발급을 막는 만료 기반 JWT 캐시·무효화 추가
 * 2026.08.30  임도헌   Modified  private 구독 전 토큰 요청을 비활성화해 공개 화면의 비로그인 401 차단
 */

"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import {
  activateRealtimeAccessToken,
  provideRealtimeAccessToken,
} from "@/lib/realtimeAccessToken";

const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabase = createClient(SUPABASE_URL!, SUPABASE_PUBLIC_KEY!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  accessToken: provideRealtimeAccessToken,
});

/**
 * 첫 private join 전에 BoardPort JWT를 명시적으로 주입한다.
 * accessToken callback은 heartbeat 갱신을 맡고, 이 함수는 최초 join의 anon-key 경합을 막는다.
 */
export async function subscribePrivateRealtimeChannel(
  channel: RealtimeChannel,
  signal?: AbortSignal,
  onStatus?: NonNullable<Parameters<RealtimeChannel["subscribe"]>[0]>
) {
  try {
    activateRealtimeAccessToken();
    await supabase.realtime.setAuth();
    if (signal?.aborted) return false;
    channel.subscribe(onStatus);
    return true;
  } catch (error) {
    if (!signal?.aborted) {
      console.error(
        "[Realtime] Private channel authorization failed:",
        error instanceof Error ? error.message : "UnknownError"
      );
    }
    return false;
  }
}
