/**
 * File Name : features/user/components/admin/AdminUserListContainer.tsx
 * Description : 유저 목록 테이블 및 관리 기능
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 유저 목록, 권한 변경, 제재 처리 기본 흐름 추가
 * 2026.02.08  임도헌   Modified  정지/해제 시 AdminActionModal 적용
 * 2026.03.18  임도헌   Modified  검색 파라미터를 URL과 재동기화하고 권한/정지 처리의 낙관 반영을 보강해 관리자 유저 목록 정합성을 정리
 * 2026.03.23  임도헌   Modified  관리자 유저 테이블/메뉴 셸과 리스트 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.29  임도헌   Modified  모바일 카드형 분기와 관리자 전용 네이밍 정리로 운영 스캔 흐름을 정비
 * 2026.03.30  임도헌   Modified  role 칩 필터, 프로필 바로가기, ID 뱃지 문법 정리와 권한 변경 모달 흐름을 함께 보강
 * 2026.04.10  임도헌   Modified  유저 목록 카드와 테이블의 배지·메타 타이포를 400·500·700 정책에 맞춰 정리
 * 2026.04.18  임도헌   Modified  프로필 링크/관리 모달 프리로드를 줄이고 모바일 카드 렌더·배지 대비를 보강해 관리자 유저 페이지 초기 부하를 완화
 * 2026.09.01  임도헌   Modified  중간 너비에서 유저 상태와 관리 동작이 잘리지 않도록 카드·테이블 전환 시점을 확장 화면으로 조정
 */
"use client";

import Link from "next/link";
import nextDynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  updateUserRoleAction,
  toggleUserBanAction,
} from "@/features/user/actions/admin";
import AdminSearchBar from "@/features/report/components/admin/AdminSearchBar";
import UserStatusBadge from "./UserStatusBadge";
import TimeAgo from "@/components/ui/TimeAgo";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import UserAvatar from "@/components/global/UserAvatar";
import {
  ArrowTopRightOnSquareIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import type {
  AdminUserListResponse,
  AdminUserItem,
} from "@/features/user/types";
import { cn } from "@/lib/utils";

const AdminActionModal = nextDynamic(
  () => import("@/features/report/components/admin/AdminActionModal"),
  {
    ssr: false,
  }
);

interface Props {
  data: AdminUserListResponse;
}

/**
 * 관리자 유저 관리 컨테이너
 *
 * [기능]
 * 1. 검색과 role 칩 필터를 통해 유저 목록을 데스크톱 테이블/모바일 카드형으로 표시함
 * 2. 프로필 바로가기와 식별자 배지를 함께 보여 운영 추적을 빠르게 함
 * 3. 권한 관리: 유저를 관리자(ADMIN)로 승격하거나 강등시킴
 * 4. 이용 제재: `AdminActionModal`을 통해 사유와 기간을 입력받아 유저를 정지(Ban) 또는 해제함
 */
export default function AdminUserListContainer({ data }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState(data.items);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const activeRole = searchParams.get("role") || "ALL";
  const hasActiveFilters =
    !!searchParams.get("query")?.trim() || activeRole !== "ALL";
  const [roleTarget, setRoleTarget] = useState<{
    id: number;
    username: string;
    currentRole: "USER" | "ADMIN";
  } | null>(null);
  // 정지/해제 대상 상태
  // 같은 모달 흐름을 재사용할 수 있도록 대상 상태만 별도로 보관
  const [banTarget, setBanTarget] = useState<{
    id: number;
    username: string;
    isBanned: boolean;
  } | null>(null);

  useEffect(() => {
    // 서버 목록 기준 UI 상태 재동기화
    // 검색·필터·페이지 이동 뒤에도 메뉴/모달이 이전 항목을 가리키지 않게 초기화
    setItems(data.items);
    setOpenMenuId(null);
    setRoleTarget(null);
    setBanTarget(null);
  }, [data.items]);

  // 권한 변경 즉시 반영
  // role 뱃지와 액션 메뉴가 서버 재응답 전 stale 상태로 남지 않도록 현재 목록도 함께 갱신
  const handleRoleChange = async (reason: string) => {
    if (!roleTarget) return;
    const newRole = roleTarget.currentRole === "USER" ? "ADMIN" : "USER";
    startTransition(async () => {
      const res = await updateUserRoleAction(roleTarget.id, newRole, reason);
      if (res.success) {
        toast.success("권한이 변경되었습니다.");
        setItems((prev) =>
          prev.map((item) =>
            item.id === roleTarget.id ? { ...item, role: newRole } : item
          )
        );
        setOpenMenuId(null);
        setRoleTarget(null);
      } else toast.error(res.error);
    });
  };

  // 정지/해제 공통 실행
  // 같은 액션을 공유하되 기간 처리와 성공 문구만 현재 상태에 맞춰 분기
  const executeBanToggle = async (reason: string, duration?: number) => {
    if (!banTarget) return;

    const finalDuration = banTarget.isBanned ? 0 : (duration ?? 0);
    const actionName = banTarget.isBanned ? "정지 해제" : "이용 정지";

    const res = await toggleUserBanAction(banTarget.id, reason, finalDuration);

    if (res.success) {
      toast.success(`${actionName} 처리가 완료되었습니다.`);
      setItems((prev) =>
        prev.map((item) =>
          item.id === banTarget.id
            ? {
                ...item,
                bannedAt: banTarget.isBanned ? null : new Date(),
              }
            : item
        )
      );
      setBanTarget(null);
    } else {
      toast.error(res.error);
    }
  };

  const handleRoleFilterChange = (role: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (role === "ALL") {
      params.delete("role");
    } else {
      params.set("role", role);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <AdminSearchBar
        placeholder="닉네임, 이메일 또는 ID 검색"
        queryKey="query"
      />

      <div className="flex flex-wrap gap-2">
        {[
          { value: "ALL", label: "전체" },
          { value: "USER", label: "일반 회원" },
          { value: "ADMIN", label: "관리자" },
          { value: "BANNED", label: "정지 유저" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleRoleFilterChange(option.value)}
            className={cn(
              "focus-ring-soft rounded-full border px-3 py-2 text-xs font-bold transition-colors",
              activeRole === option.value
                ? "border-border-strong bg-brand/10 text-brand dark:text-brand-light"
                : "border-border bg-surface text-muted hover:text-primary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 xl:hidden">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-16 text-center text-sm text-muted shadow-sm">
            {hasActiveFilters
              ? "검색/필터 조건에 맞는 유저가 없습니다."
              : "등록된 유저가 없습니다."}
          </div>
        ) : (
          items.map((user: AdminUserItem) => (
            <article
              key={user.id}
              className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "420px",
              }}
            >
              <div className="flex items-start gap-3">
                <UserAvatar
                  username={user.username}
                  avatar={user.avatar}
                  size="sm"
                  showUsername={false}
                  disabled
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-bold text-primary">
                          {user.username}
                        </h3>
                        <Link
                          href={`/profile/${user.username}`}
                          prefetch={false}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring-soft shrink-0 rounded text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
                          aria-label={`${user.username} 프로필 보기`}
                        >
                          <ArrowTopRightOnSquareIcon className="size-4" />
                        </Link>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">
                        {user.email || "소셜 계정"}
                      </p>
                    </div>
                    <UserStatusBadge bannedAt={user.bannedAt} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-surface px-2 py-1 text-xs font-mono font-medium text-primary">
                      #{user.id}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-1 text-xs font-bold",
                        user.role === "ADMIN"
                          ? "border-brand/20 bg-brand/10 text-brand dark:border-brand-light/25 dark:bg-brand-light/10 dark:text-brand-light"
                          : "border-border bg-surface-dim text-primary"
                      )}
                    >
                      {user.role}
                    </span>
                    {user._count.reports_received > 0 ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
                        신고 {user._count.reports_received}건
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-surface-dim/30 px-3 py-3">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    가입일
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-primary">
                    <TimeAgo date={user.created_at} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    게시글/상품
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-primary">
                    {user._count.posts} / {user._count.products}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    신고
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-primary">
                    {user._count.reports_received}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRoleTarget({
                      id: user.id,
                      username: user.username,
                      currentRole: user.role,
                    })
                  }
                  className="focus-ring-soft rounded-xl border border-border-subtle bg-surface-dim/30 px-3 py-2.5 text-xs font-bold text-primary"
                >
                  {user.role === "USER" ? "관리자 승격" : "일반 유저 강등"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBanTarget({
                      id: user.id,
                      username: user.username,
                      isBanned: !!user.bannedAt,
                    })
                  }
                  className={cn(
                    "focus-ring-soft rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors",
                    user.bannedAt
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400"
                      : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/40"
                  )}
                >
                  {user.bannedAt ? "이용 정지 해제" : "서비스 이용 정지"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Table Area */}
      <div className="hidden overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm xl:block">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border-subtle">
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
            <tbody className="divide-y divide-border-subtle">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted">
                    {hasActiveFilters
                      ? "검색/필터 조건에 맞는 유저가 없습니다."
                      : "등록된 유저가 없습니다."}
                  </td>
                </tr>
              ) : (
                items.map((user: AdminUserItem) => (
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-primary">
                              {user.username}
                            </span>
                            <span className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-xs font-medium text-primary">
                              #{user.id}
                            </span>
                            <Link
                              href={`/profile/${user.username}`}
                              prefetch={false}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="focus-ring-soft shrink-0 rounded text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
                              aria-label={`${user.username} 프로필 보기`}
                            >
                              <ArrowTopRightOnSquareIcon className="size-4" />
                            </Link>
                          </div>
                          <span className="text-xs text-muted">
                            {user.email || "소셜 계정"}
                          </span>
                        </div>
                      </div>
                    </td>
                    {/* 권한 뱃지 */}
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-bold",
                          user.role === "ADMIN"
                            ? "border-brand/20 bg-brand/10 text-brand dark:border-brand-light/25 dark:bg-brand-light/10 dark:text-brand-light"
                            : "border-border bg-surface-dim text-primary"
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
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
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
                          type="button"
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === user.id ? null : user.id
                            )
                          }
                          className="focus-ring-soft p-2 text-muted hover:text-primary hover:bg-surface-dim rounded-xl transition-colors"
                        >
                          <EllipsisVerticalIcon className="size-5" />
                        </button>

                        {openMenuId === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-44 bg-surface rounded-xl shadow-xl border border-border-subtle z-50 py-1.5 origin-top-right">
                              <div className="flex flex-col">
                                {/* 권한 변경 버튼 */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setRoleTarget({
                                      id: user.id,
                                      username: user.username,
                                      currentRole: user.role,
                                    });
                                  }}
                                  className="focus-ring-soft w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:bg-surface-dim"
                                >
                                  {user.role === "USER"
                                    ? "관리자 승격"
                                    : "일반 유저 강등"}
                                </button>

                                <div
                                  role="separator"
                                  className="h-px bg-border-subtle"
                                />

                                {/* 정지 버튼 */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setBanTarget({
                                      id: user.id,
                                      username: user.username,
                                      isBanned: !!user.bannedAt,
                                    });
                                  }}
                                  className={cn(
                                    "focus-ring-soft w-full text-left px-4 py-2.5 text-xs font-bold",
                                    user.bannedAt
                                      ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                                      : "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/20"
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

      <AdminActionModal
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        title={
          roleTarget?.currentRole === "USER" ? "관리자 승격" : "일반 유저 강등"
        }
        description={
          roleTarget
            ? roleTarget.currentRole === "USER"
              ? `'${roleTarget.username}'님에게 관리자 권한을 부여하시겠습니까?`
              : `'${roleTarget.username}'님의 관리자 권한을 해제하시겠습니까?`
            : ""
        }
        confirmLabel={
          roleTarget?.currentRole === "USER" ? "승격 확정" : "강등 확정"
        }
        confirmVariant="primary"
        onConfirm={handleRoleChange}
        placeholder="권한 변경 사유를 입력해주세요 (감사 로그와 알림에 기록됩니다)"
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
