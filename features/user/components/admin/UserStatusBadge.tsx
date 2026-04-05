/**
 * File Name : features/user/components/admin/UserStatusBadge.tsx
 * Description : 유저 상태 뱃지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   유저 제재 여부를 공통 색상 문법으로 보여주는 상태 뱃지 추가
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
        "px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider",
        isBanned
          ? "bg-danger/10 text-danger border-danger/20"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      )}
    >
      {isBanned ? "이용 정지" : "정상"}
    </span>
  );
}
