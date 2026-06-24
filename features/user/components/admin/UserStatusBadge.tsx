/**
 * File Name : features/user/components/admin/UserStatusBadge.tsx
 * Description : 유저 상태 뱃지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   유저 제재 여부를 공통 색상 문법으로 보여주는 상태 뱃지 추가
 * 2026.04.10  임도헌   Modified  유저 상태 뱃지 크기를 관리자 공통 타이포 스케일에 맞춰 정리
 * 2026.04.18  임도헌   Modified  이용 정지 뱃지 대비를 높여 관리자 유저 카드/테이블 접근성을 보강
 */
import { cn } from "@/lib/utils";

/**
 * 유저 계정 상태 뱃지
 *
 * [기능]
 * 1. bannedAt 유무에 따라 '정상' 또는 '이용 정지' 상태를 시각적으로 구분
 * 2. 제재 여부를 유저 관리/신고/감사 로그와 같은 관리자 색상 문법으로 표시
 */
export default function UserStatusBadge({
  bannedAt,
}: {
  bannedAt: Date | null;
}) {
  const isBanned = !!bannedAt;
  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider",
        isBanned
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      )}
    >
      {isBanned ? "이용 정지" : "정상"}
    </span>
  );
}
