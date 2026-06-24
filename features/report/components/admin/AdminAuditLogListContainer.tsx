/**
 * File Name : features/report/components/admin/AdminAuditLogListContainer.tsx
 * Description : 관리자 감사 로그 목록 UI (반응형 테이블 + 한글 포맷팅)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   컴포넌트 분리 및 반응형 대응
 * 2026.02.26  임도헌   Modified  사유에 whitespace-normal 추가해서 줄바꿈 되도록 변경
 * 2026.03.23  임도헌   Modified  관리자 감사 로그 테이블 셸과 리스트 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.29  임도헌   Modified  관리자 전용 네이밍 정리와 모바일 카드형 분기로 긴 로그 스캔 흐름을 정비
 * 2026.03.30  임도헌   Modified  액션/대상 타입 빠른 필터를 comment·review·message까지 확장
 * 2026.04.10  임도헌   Modified  감사 로그 카드와 테이블의 배지·메타 타이포를 400·500·700 정책에 맞춰 정리
 * 2026.04.18  임도헌   Modified  모바일 카드 lazy paint, 액션/ID 배지 대비, 상세 링크 프리패치를 최적화
 * 2026.04.19  임도헌   Modified  액션/대상 타입 필터 칩에 공용 포커스 링을 적용해 관리자 목록 포커스 문법을 통일
 * 2026.04.28  임도헌   Modified  신고 제재 관련 감사 로그 사유를 운영자가 읽기 쉬운 한글 요약으로 포맷
 * 2026.04.28  임도헌   Modified  삭제 감사 로그의 OwnerID 옆에 유저명을 함께 표시
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import AdminSearchBar from "@/features/report/components/admin/AdminSearchBar";
import TimeAgo from "@/components/ui/TimeAgo";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  formatAuditReason,
  getAuditLogTargetUrl,
} from "@/features/report/utils/adminFormatter";
import { cn } from "@/lib/utils";
import {
  AUDIT_ACTION_LABELS,
  TARGET_TYPE_LABELS,
} from "@/features/report/constants";
import type { AdminAuditLogListResponse } from "@/features/report/types";

interface Props {
  data: AdminAuditLogListResponse;
  activeAction: string;
  activeTargetType: string;
}

/**
 * 감사 로그 목록 컨테이너
 *
 * [기능]
 * 1. 관리자명·액션·대상·사유 검색과 액션/대상 타입 빠른 필터를 함께 제공
 * 2. 데스크톱 테이블과 모바일 카드형 레이아웃으로 감사 로그를 읽기 쉽게 분기
 * 3. 로그 액션 타입에 따라 시각적 배지를 차별화하고, 추적 가능한 대상은 바로가기 링크를 연결
 * 4. 구조화된 사유를 파싱해 원인과 메타 정보를 분리해 보여주고 페이지네이션을 통합
 * 5. 삭제 로그의 소유자 ID는 유저명과 함께 표시해 삭제 후에도 대상 식별성을 유지
 */
export default function AdminAuditLogListContainer({
  data,
  activeAction,
  activeTargetType,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasQuery = !!searchParams.get("q")?.trim();
  const returnTo = sanitizeCallbackUrl(
    searchParams?.size ? `${pathname}?${searchParams.toString()}` : pathname
  );

  const actionFilters = [
    { value: "ALL", label: "전체 액션" },
    { value: "RESOLVE_REPORT", label: "신고 승인" },
    { value: "DISMISS_REPORT", label: "신고 기각" },
    { value: "BAN_USER", label: "유저 정지" },
    { value: "UNBAN_USER", label: "정지 해제" },
    { value: "CHANGE_ROLE", label: "권한 변경" },
    { value: "DELETE_POST", label: "게시글 삭제" },
    { value: "DELETE_PRODUCT", label: "상품 삭제" },
    { value: "DELETE_COMMENT", label: "댓글 삭제" },
    { value: "DELETE_REVIEW", label: "리뷰 삭제" },
    { value: "DELETE_MESSAGE", label: "메시지 삭제" },
    { value: "DELETE_STREAM", label: "방송 종료" },
  ];

  const targetTypeFilters = [
    { value: "ALL", label: "전체 대상" },
    { value: "USER", label: "유저" },
    { value: "REPORT", label: "신고" },
    { value: "POST", label: "게시글" },
    { value: "PRODUCT", label: "상품" },
    { value: "COMMENT", label: "댓글" },
    { value: "REVIEW", label: "리뷰" },
    { value: "MESSAGE", label: "메시지" },
    { value: "STREAM", label: "방송" },
  ];

  const handleFilterChange = (key: "action" | "targetType", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminSearchBar placeholder="관리자명, 액션, 대상, 사유 검색" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {actionFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => handleFilterChange("action", filter.value)}
              className={cn(
                "focus-ring-soft rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                activeAction === filter.value
                  ? "border-border-strong bg-brand/10 text-brand dark:text-brand-light"
                  : "border-border bg-surface text-muted hover:text-primary"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {targetTypeFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => handleFilterChange("targetType", filter.value)}
              className={cn(
                "focus-ring-soft rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                activeTargetType === filter.value
                  ? "border-border-strong bg-brand/10 text-brand dark:text-brand-light"
                  : "border-border bg-surface text-muted hover:text-primary"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {data.items.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-16 text-center text-sm text-muted shadow-sm">
            {hasQuery
              ? "검색된 감사 로그가 없습니다."
              : "기록된 감사 로그가 없습니다."}
          </div>
        ) : (
          data.items.map((log) => {
            const actionLabel = AUDIT_ACTION_LABELS[log.action] || log.action;
            const targetLabel =
              TARGET_TYPE_LABELS[log.targetType] || log.targetType;
            const targetUrl = getAuditLogTargetUrl(log, returnTo);
            const isDanger = [
              "BAN_USER",
              "DELETE_PRODUCT",
              "DELETE_POST",
              "DELETE_STREAM",
            ].includes(log.action);
            const isSuccess = ["UNBAN_USER", "RESOLVE_REPORT"].includes(
              log.action
            );
            const isInfo = ["CHANGE_ROLE", "DISMISS_REPORT"].includes(
              log.action
            );
            const { displayReason, metaInfo } = formatAuditReason(
              log.action,
              log.reason,
              { reasonOwnerUsername: log.reasonOwnerUsername }
            );

            return (
              <article
                key={log.id}
                className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: "220px",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                          isDanger &&
                            "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300",
                          isSuccess &&
                            "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                          isInfo &&
                            "border-brand/15 bg-brand/10 text-brand dark:text-brand-light"
                        )}
                      >
                        {actionLabel}
                      </span>
                      <span className="rounded-full bg-surface-dim px-2 py-1 text-xs font-mono text-primary ring-1 ring-border-subtle">
                        {targetLabel} #{log.targetId}
                      </span>
                      {targetUrl ? (
                        <Link
                          href={targetUrl}
                          prefetch={false}
                          target={
                            targetUrl.startsWith("/admin")
                              ? undefined
                              : "_blank"
                          }
                          rel={
                            targetUrl.startsWith("/admin")
                              ? undefined
                              : "noopener noreferrer"
                          }
                          className="focus-ring-soft rounded text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
                          aria-label={`${targetLabel} ${log.targetId} 상세 보기`}
                        >
                          <ArrowTopRightOnSquareIcon className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-medium text-primary">
                      {displayReason || "-"}
                    </p>
                    {metaInfo ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {metaInfo}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-primary">
                      {log.admin.username}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      <TimeAgo date={log.created_at} />
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border-subtle">
              <tr>
                <th className="px-6 py-4 w-40">일시</th>
                <th className="px-6 py-4 w-32">관리자</th>
                <th className="px-6 py-4 w-32">액션</th>
                <th className="px-6 py-4 w-48">대상</th>
                <th className="px-6 py-4">사유 및 상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted">
                    {hasQuery
                      ? "검색된 감사 로그가 없습니다."
                      : "기록된 감사 로그가 없습니다."}
                  </td>
                </tr>
              ) : (
                data.items.map((log) => {
                  const actionLabel =
                    AUDIT_ACTION_LABELS[log.action] || log.action;
                  const targetLabel =
                    TARGET_TYPE_LABELS[log.targetType] || log.targetType;
                  const targetUrl = getAuditLogTargetUrl(log, returnTo);

                  const isDanger = [
                    "BAN_USER",
                    "DELETE_PRODUCT",
                    "DELETE_POST",
                    "DELETE_STREAM",
                  ].includes(log.action);
                  const isSuccess = ["UNBAN_USER", "RESOLVE_REPORT"].includes(
                    log.action
                  );
                  const isInfo = ["CHANGE_ROLE", "DISMISS_REPORT"].includes(
                    log.action
                  );

                  const { displayReason, metaInfo } = formatAuditReason(
                    log.action,
                    log.reason,
                    { reasonOwnerUsername: log.reasonOwnerUsername }
                  );

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-dim/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-muted">
                        <TimeAgo date={log.created_at} />
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">
                        {log.admin.username}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "rounded border px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                            isDanger &&
                              "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300",
                            isSuccess &&
                              "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                            isInfo &&
                              "border-brand/15 bg-brand/10 text-brand dark:text-brand-light"
                          )}
                        >
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-primary">
                              {targetLabel}
                            </span>
                            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-mono text-primary ring-1 ring-border-subtle">
                              #{log.targetId}
                            </span>
                          </div>
                          {targetUrl ? (
                            <Link
                              href={targetUrl}
                              prefetch={false}
                              target={
                                targetUrl.startsWith("/admin")
                                  ? undefined
                                  : "_blank"
                              }
                              rel={
                                targetUrl.startsWith("/admin")
                                  ? undefined
                                  : "noopener noreferrer"
                              }
                              className="focus-ring-soft rounded text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
                              aria-label={`${targetLabel} ${log.targetId} 상세 보기`}
                            >
                              <ArrowTopRightOnSquareIcon className="size-4" />
                            </Link>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5 max-w-md whitespace-normal">
                          {metaInfo && (
                            <span className="text-xs text-muted/60 truncate">
                              {metaInfo}
                            </span>
                          )}
                          <span className="text-primary truncate font-medium">
                            {displayReason || "-"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AdminPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />
    </div>
  );
}
