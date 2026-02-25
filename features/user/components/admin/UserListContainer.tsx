/**
 * File Name : features/user/components/admin/UserListContainer.tsx
 * Description : 유저 목록 테이블 및 관리 기능
 * Author : 임도헌
 *
 * History
 * 2026.02.06  임도헌   Created
 * 2026.02.08  임도헌   Modified  정지/해제 시 AdminActionModal 적용
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateUserRoleAction,
  toggleUserBanAction,
} from "@/features/user/actions/admin";
import UserStatusBadge from "./UserStatusBadge";
import TimeAgo from "@/components/ui/TimeAgo";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import UserAvatar from "@/components/global/UserAvatar";
import AdminActionModal from "@/features/report/components/admin/AdminActionModal";
import {
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import type {
  AdminUserListResponse,
  AdminUserItem,
} from "@/features/user/types";
import { cn } from "@/lib/utils";

interface Props {
  data: AdminUserListResponse;
  searchParams: { query?: string; role?: string };
}

/**
 * 관리자 유저 관리 컨테이너
 *
 * [기능]
 * 1. 유저 목록(프로필, 권한, 상태, 활동 지표)을 테이블로 표시함
 * 2. 닉네임 또는 이메일 기반 검색 기능을 제공함
 * 3. 권한 관리: 유저를 관리자(ADMIN)로 승격하거나 강등시킴
 * 4. 이용 제재: `AdminActionModal`을 통해 사유와 기간을 입력받아 유저를 정지(Ban) 또는 해제함
 */
export default function UserListContainer({ data, searchParams }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [keyword, setKeyword] = useState(searchParams.query || "");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  // 정지/해제 모달 상태
  const [banTarget, setBanTarget] = useState<{
    id: number;
    username: string;
    isBanned: boolean;
  } | null>(null);

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/users?query=${encodeURIComponent(keyword)}&page=1`);
  };

  // 권한 변경 핸들러
  const handleRoleChange = (userId: number, currentRole: string) => {
    const newRole = currentRole === "USER" ? "ADMIN" : "USER";
    if (!confirm(`해당 유저를 ${newRole}로 변경하시겠습니까?`)) return;

    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.success) {
        toast.success("권한이 변경되었습니다.");
        setOpenMenuId(null);
      } else toast.error(res.error);
    });
  };

  // 정지/해제 핸들러
  const executeBanToggle = async (reason: string, duration?: number) => {
    if (!banTarget) return;

    // 해제일 때는 duration 무시, 정지일 때는 전달받은 duration 사용 (기본값 0)
    const finalDuration = banTarget.isBanned ? 0 : (duration ?? 0);
    const actionName = banTarget.isBanned ? "정지 해제" : "이용 정지";

    const res = await toggleUserBanAction(banTarget.id, reason, finalDuration);

    if (res.success) {
      toast.success(`${actionName} 처리가 완료되었습니다.`);
      setBanTarget(null);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 max-w-md">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="닉네임 또는 이메일 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input-primary w-full pl-11 pr-4 py-2.5 text-sm bg-surface"
          />
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-6 h-11 text-sm font-bold shadow-md"
        >
          검색
        </button>
      </form>

      {/* Table Area */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4">유저</th>
                <th className="px-6 py-4">권한</th>
                <th className="px-6 py-4">상태</th>
                <th className="px-6 py-4">가입일</th>
                <th className="px-6 py-4 text-center">신고</th>
                <th className="px-6 py-4 text-center">활동</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted">
                    검색된 유저가 없습니다.
                  </td>
                </tr>
              ) : (
                data.items.map((user: AdminUserItem) => (
                  <tr
                    key={user.id}
                    className="hover:bg-surface-dim/30 transition-colors"
                  >
                    {/* 유저 정보 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          username={user.username}
                          avatar={user.avatar}
                          size="sm"
                          showUsername={false}
                          disabled
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">
                            {user.username}
                          </span>
                          <span className="text-[10px] text-muted">
                            {user.email || "소셜 계정"}
                          </span>
                        </div>
                      </div>
                    </td>
                    {/* 권한 뱃지 */}
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          user.role === "ADMIN"
                            ? "bg-accent/20 text-accent-dark"
                            : "bg-surface-dim text-muted"
                        )}
                      >
                        {user.role}
                      </span>
                    </td>
                    {/* 상태 뱃지 */}
                    <td className="px-6 py-4">
                      <UserStatusBadge bannedAt={user.bannedAt} />
                    </td>
                    {/* 가입일 */}
                    <td className="px-6 py-4 text-muted">
                      <TimeAgo date={user.created_at} />
                    </td>
                    {/* 신고 횟수 (위험 지표 강조) */}
                    <td className="px-6 py-4 text-center">
                      {user._count.reports_received > 0 ? (
                        <span className="text-danger font-black bg-danger/10 px-2 py-0.5 rounded-full text-xs">
                          {user._count.reports_received}
                        </span>
                      ) : (
                        <span className="text-muted/30">-</span>
                      )}
                    </td>
                    {/* 활동량 (글/상품) */}
                    <td className="px-6 py-4 text-center text-muted text-xs">
                      <span title="게시글">{user._count.posts}</span> /{" "}
                      <span title="상품">{user._count.products}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === user.id ? null : user.id
                            )
                          }
                          className="p-2 text-muted hover:text-primary hover:bg-surface-dim rounded-xl transition-colors"
                        >
                          <EllipsisVerticalIcon className="size-5" />
                        </button>

                        {openMenuId === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-44 bg-surface rounded-xl shadow-xl border border-border z-50 py-1.5 animate-fade-in origin-top-right">
                              <div className="flex flex-col">
                                {/* 권한 변경 버튼 */}
                                <button
                                  onClick={() =>
                                    handleRoleChange(user.id, user.role)
                                  }
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:bg-surface-dim"
                                >
                                  {user.role === "USER"
                                    ? "관리자 승격"
                                    : "일반 유저 강등"}
                                </button>

                                <div
                                  role="separator"
                                  className="h-px bg-border"
                                />

                                {/* 정지 버튼 */}
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setBanTarget({
                                      id: user.id,
                                      username: user.username,
                                      isBanned: !!user.bannedAt,
                                    });
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-2.5 text-xs font-bold",
                                    user.bannedAt
                                      ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                                      : "text-danger hover:bg-danger/5"
                                  )}
                                >
                                  {user.bannedAt
                                    ? "이용 정지 해제"
                                    : "서비스 이용 정지"}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />

      {/* 정지/해제 사유 입력 모달 */}
      <AdminActionModal
        open={!!banTarget}
        onClose={() => setBanTarget(null)}
        title={banTarget?.isBanned ? "이용 정지 해제" : "서비스 이용 정지"}
        description={
          banTarget?.isBanned
            ? `'${banTarget?.username}'님의 이용 정지를 해제하시겠습니까?`
            : `'${banTarget?.username}'님의 서비스 이용을 정지하시겠습니까?`
        }
        confirmLabel={banTarget?.isBanned ? "해제 확정" : "정지 확정"}
        confirmVariant={banTarget?.isBanned ? "success" : "danger"}
        onConfirm={executeBanToggle}
        placeholder="처리 사유를 입력해주세요 (유저에게 알림으로 전송됩니다)"
        showBanOptions={!banTarget?.isBanned}
      />
    </div>
  );
}
