/**
 * File Name : features/user/components/profile/ProfileOptionMenu.tsx
 * Description : 타인 프로필용 옵션 메뉴 (차단/신고)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.04  임도헌   Created   차단/신고 드롭다운 메뉴
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.12  임도헌   Modified  타인 프로필 flat 헤더 톤에 맞춰 패널 보더를 subtle 기준으로 정리
 * 2026.03.18  임도헌   Modified  차단/해제 시 search까지 포함한 현재 프로필 경로를 정규화해 revalidate·복귀 문맥과 nested returnTo 예외를 함께 보강
 * 2026.04.03  임도헌   Modified  전역 유저 차단 확인 문구를 다른 도메인과 같은 정책 설명 톤으로 통일
 */
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { toggleBlockAction } from "@/features/user/actions/block";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePathname, useSearchParams } from "next/navigation";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface ProfileOptionMenuProps {
  targetId: number;
  username: string; // 차단 확인 모달 메시지용
  isBlocked: boolean;
}

/**
 * 타인 프로필 페이지의 더보기 옵션 메뉴
 *
 * [기능]
 * 1. 대상 유저에 대한 '차단하기' 또는 '차단 해제하기' 기능을 제공함
 * 2. 대상 유저를 신고할 수 있는 모달(`ReportModal`)을 호출함
 * 3. 차단 실행 시 `ConfirmDialog`를 통해 재확인 절차를 거침
 */
export default function ProfileOptionMenu({
  targetId,
  username,
  isBlocked,
}: ProfileOptionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString();
  const currentPath = sanitizeCallbackUrl(
    `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
  );

  // 외부 클릭 닫기
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  // 차단/해제 실행
  const handleToggleBlock = () => {
    startTransition(async () => {
      const intent = isBlocked ? "unblock" : "block";
      // 현재 프로필 쿼리까지 포함해 차단 후 동일 문맥을 다시 불러오도록 경로 전달
      const result = await toggleBlockAction(targetId, intent, currentPath);

      if (result.success) {
        toast.success(
          isBlocked
            ? `${username}님 차단을 해제했습니다.`
            : `${username}님을 차단했습니다.`
        );
      } else {
        toast.error(result.error ?? "요청 처리에 실패했습니다.");
      }
      setConfirmOpen(false);
      setIsOpen(false);
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-muted hover:text-primary rounded-full hover:bg-surface-dim transition-colors"
        aria-label="옵션 더보기"
      >
        <EllipsisHorizontalIcon className="size-6" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-xl z-50">
          {/* 차단하기 / 해제하기 */}
          <button
            onClick={() => setConfirmOpen(true)}
            className={cn(
              "w-full text-left px-4 py-3 text-sm font-medium transition-colors",
              isBlocked
                ? "text-primary hover:bg-surface-dim"
                : "text-danger hover:bg-danger/10 dark:hover:bg-danger/20"
            )}
          >
            {isBlocked ? "차단 해제하기" : "차단하기"}
          </button>

          {/*  신고 버튼 */}
          <button
            onClick={() => {
              setIsOpen(false);
              setReportOpen(true);
            }}
            className="w-full border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            신고하기
          </button>
        </div>
      )}

      {/* 차단 확인 Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={isBlocked ? "차단 해제" : "유저 차단"}
        description={
          isBlocked
            ? `${username}님의 차단을 해제하시겠습니까?`
            : `${username}님을 차단하시겠습니까? 차단하면 전역 차단 관계가 생성되고, 서로의 글과 채팅을 볼 수 없으며 팔로우가 취소됩니다.`
        }
        confirmLabel={isBlocked ? "해제" : "차단"}
        cancelLabel="취소"
        onConfirm={handleToggleBlock}
        onCancel={() => setConfirmOpen(false)}
        loading={isPending}
      />

      {/* 신고 모달 */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={targetId}
        targetType="USER"
      />
    </div>
  );
}
