/**
 * File Name : features/user/components/admin/UserStatusBadge.tsx
 * Description : 유저 상태 뱃지
 * Author : 임도헌
 *
 * History
 * 2026.02.06  임도헌   Created
 */
import { cn } from "@/lib/utils";

/**
 * 유저 계정 상태 뱃지
 *
 * [기능]
 * 1. `bannedAt` 필드 유무에 따라 '정상' 또는 '이용 정지' 상태를 시각적으로 구분하여 표시함
 * 2. 정지 상태일 경우 붉은색, 정상일 경우 초록색 스타일을 적용함
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
