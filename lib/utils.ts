/**
 * File Name : lib/utils.ts
 * Description : 공통 유틸리티 함수들 (클라이언트/서버 공용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified   제품 관련 함수 추가
 * 2024.11.23  임도헌   Modified   시간 포맷 수정(일,주,달 기준)
 * 2024.12.11  임도헌   Modified   시간 포맷 수정(한국 시간대 기준)
 * 2024.12.23  임도헌   Modified   뱃지 관련 함수 추가
 * 2025.03.29  임도헌   Modified   커뮤니티 기여도 함수명 및 로직 변경(isPopularity)
 * 2025.04.18  임도헌   Modified   구성품 관리자 뱃지를 품질의 달인 뱃지로 변경
 * 2025.05.29  임도헌   Modified   cn 유틸(tailwind-merge, clsx 기능 조합)
 * 2025.11.29  임도헌   Modified   DB 의존 함수 분리(Prisma 7 빌드 이슈 대응)
 * 2025.11.29  임도헌   Modified   formatToTimeAgo 로직 변경(nowInput 추가)
 * 2026.02.02  임도헌   Modified   JSDoc 표준화 및 유틸 역할 명확화
 * 2026.02.13  임도헌   Modified  공유하기 공용 유틸(handleShare) 추가
 */

import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * - clsx로 조건부 클래스를 처리하고 twMerge로 스타일 충돌을 방지
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(...inputs));

/**
 * 상대 시간 표시 유틸리티 (한국 시간대 기준)
 * - 입력된 날짜를 현재 시각과 비교하여 "방금 전", "N분 전", "N일 전" 등으로 반환
 *
 * @param date - ISO 8601 형식의 날짜 문자열 또는 Date 객체
 * @param nowInput - 비교 기준이 될 현재 시각 (ms, 생략 시 현재 시각)
 * @returns 상대 시간 문자열
 */
export const formatToTimeAgo = (date: string, nowInput?: number): string => {
  const koreaTime = new Date(date).toLocaleString("en-US", {
    timeZone: "Asia/Seoul",
  });
  const time = new Date(koreaTime).getTime();

  const nowKoreaString =
    nowInput !== undefined
      ? new Date(nowInput).toLocaleString("en-US", { timeZone: "Asia/Seoul" })
      : new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" });

  const nowTime = new Date(nowKoreaString).getTime();

  const diffTime = nowTime - time;
  const dayInMs = 1000 * 60 * 60 * 24;
  const diffInDays = Math.floor(diffTime / dayInMs);
  const diffInHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffTime / (1000 * 60));

  if (diffInDays > 0) {
    if (diffInDays >= 30) return `${Math.floor(diffInDays / 30)}달 전`;
    if (diffInDays >= 7) return `${Math.floor(diffInDays / 7)}주일 전`;
    return `${diffInDays}일 전`;
  }
  if (diffInHours > 0) {
    const koreaDate = new Date(koreaTime);
    const hours = koreaDate.getHours();
    const amPm = hours >= 12 ? "오후" : "오전";
    const displayHours = hours % 12 || 12;
    return `${amPm} ${displayHours}시 ${koreaDate.getMinutes()}분`;
  }
  if (diffInMinutes > 0) return `${diffInMinutes}분 전`;
  return `방금 전`;
};

/**
 * 통화 포맷팅 (3자리 콤마)
 * @param price - 숫자 가격
 * @returns "1,000" 형식의 문자열
 */
export const formatToWon = (price: number): string => {
  return price.toLocaleString("ko-KR");
};

// 초 단위 영상 시간을 "분 초" 문자열로 변환
export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
};

/**
 * 전역 공유하기 핸들러
 * - Web Share API를 우선 사용하며, 미지원 환경에서는 URL을 클립보드에 복사함
 *
 * @param title 공유할 제목
 * @param url 공유할 URL (생략 시 현재 창 주소)
 */
export const handleShare = async (title: string, url?: string) => {
  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("링크가 클립보드에 복사되었습니다. ⚓");
    }
  } catch (error) {
    // 사용자가 공유를 취소한 경우는 무시, 그 외 에러만 처리
    if (!(error instanceof Error && error.name === "AbortError")) {
      toast.error("공유하기에 실패했습니다.");
    }
  }
};
