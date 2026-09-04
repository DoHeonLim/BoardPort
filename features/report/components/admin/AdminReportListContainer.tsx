/**
 * File Name : features/report/components/admin/AdminReportListContainer.tsx
 * Description : 관리자 신고 목록 테이블 및 필터링
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   데스크톱 최적화 테이블 UI 구현
 * 2026.03.09  임도헌   Modified  대상 유저 최근 90일 strike 누적치 표시
 * 2026.03.09  임도헌   Modified  처리 완료 신고의 관리자 조치 내역 표시
 * 2026.03.10  임도헌   Modified  ReportActionDialog 권장 조치/strike 반영에 맞춰 낙관적 업데이트 흐름 보강
 * 2026.03.18  임도헌   Modified  신고 대상 상세 진입의 returnTo 전달, 대기 탭 낙관 제거, 단독 상세 없음 안내, 서버 목록 재동기화를 함께 정리해 관리자 신고 목록 정합성을 보강
 * 2026.03.19  임도헌   Modified  관리자 신고 목록 현재 경로도 내부 경로 기준으로 정규화해 raw returnTo 재전파를 방지
 * 2026.03.23  임도헌   Modified  관리자 신고 목록 탭/테이블 셸과 리스트 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.29  임도헌   Modified  모바일 카드형 분기와 관리자 전용 네이밍 정리로 신고 목록 스캔 흐름을 정비
 * 2026.03.30  임도헌   Modified  신고 처리 모달 자동 오픈, 대상 식별자/부모 문맥 표시, 내부 admin 링크 same-tab 동선을 함께 보강
 * 2026.04.10  임도헌   Modified  신고 목록 카드와 테이블의 배지·메타 타이포를 400·500·700 정책에 맞춰 정리
 * 2026.04.18  임도헌   Modified  초기 번들 부담을 줄이기 위해 처리 모달을 지연 로딩하고 내부 링크 프리패치를 제한
 * 2026.04.27  임도헌   Modified  신고 처리 모달이 대상 타입에 맞춰 조치 추천을 보정할 수 있도록 targetType 전달
 * 2026.04.28  임도헌   Modified  신고 처리 모달에 실제 조치 대상 유저 메타를 전달
 * 2026.09.01  임도헌   Modified  중간 너비에서 신고 정보와 처리 동작이 잘리지 않도록 카드·테이블 전환 시점을 확장 화면으로 조정
 * 2026.09.04  임도헌   Modified  신고 목록에 대상 제목·사용자명과 작성자 식별 정보 표시
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TimeAgo from "@/components/ui/TimeAgo";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import AdminSearchBar from "@/features/report/components/admin/AdminSearchBar";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import ReportStatusBadge from "@/features/report/components/admin/ReportStatusBadge";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  getDirectTargetUrl,
  getReportTargetLabel,
  getReportTargetId,
  getReportTargetParentId,
  getReportTargetParentLabel,
  getReportTargetType,
  getParentContextUrl,
  getTargetUrl,
} from "@/features/report/utils/adminFormatter";
import { REPORT_REASON_LABELS } from "@/features/report/constants";
import type { ReportReason } from "@/generated/prisma/client";
import type {
  AdminReportListResponse,
  AdminReportItem,
} from "@/features/report/types";
import { cn } from "@/lib/utils";

const ReportActionDialog = dynamic(
  () => import("@/features/report/components/admin/ReportActionDialog"),
  { ssr: false }
);

interface AdminReportListContainerProps {
  data: AdminReportListResponse;
  currentStatus: string;
}

/**
 * 관리자 신고 목록 컨테이너
 *
 * [기능]
 * 1. 신고 상태별(대기/처리됨/기각/전체) 탭 필터링 제공
 * 2. 검색·상태 탭·페이지네이션과 함께 신고 목록을 데스크톱 테이블/모바일 카드형으로 렌더링
 * 3. 신고 대상과 상위 문맥을 구분해 표시하고, 추적 가능한 화면 링크를 연결
 * 4. 최근 90일 strike 누적치와 관리자 조치 내역을 함께 보여줌
 * 5. `open` 파라미터로 특정 신고 처리 모달을 자동으로 열 수 있음
 * 6. 처리 성공 시 현재 탭 기준에 맞춰 낙관적 업데이트와 목록 제거를 반영
 * 7. 처리 모달이 조치 대상 유저와 대상 타입을 알 수 있도록 메타를 전달
 */
export default function AdminReportListContainer({
  data,
  currentStatus,
}: AdminReportListContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<AdminReportItem[]>(data.items);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const currentSearch = searchParams?.toString();
  const hasQuery = !!searchParams.get("q")?.trim();
  const autoOpenReportId = Number(searchParams.get("open"));
  const selectedReport =
    selectedReportId !== null
      ? (reports.find((report) => report.id === selectedReportId) ?? null)
      : null;
  // 안전한 내부 복귀 경로
  // 상세 진입과 모달 자동 오픈을 오갈 때 raw 외부 경로가 다시 전파되지 않도록 내부 경로 정규화
  const returnTo = sanitizeCallbackUrl(
    currentSearch ? `${pathname}?${currentSearch}` : pathname
  );

  useEffect(() => {
    // 서버 목록 기준 낙관 상태 재동기화
    // 탭/검색/페이지 이동 뒤에는 로컬 낙관 상태보다 최신 서버 응답 우선 반영
    setReports(data.items);
    setSelectedReportId(null);
  }, [data.items]);

  useEffect(() => {
    if (!Number.isFinite(autoOpenReportId) || autoOpenReportId <= 0) return;
    if (selectedReportId) return;

    const matchedReport = data.items.find(
      (report) => report.id === autoOpenReportId
    );
    if (matchedReport) {
      setSelectedReportId(matchedReport.id);
    }
  }, [autoOpenReportId, data.items, selectedReportId]);

  // 상태 탭 전환
  // 현재 검색어는 유지하되 다른 탭으로 이동할 때는 1페이지부터 다시 시작
  const handleTabChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", status);
    params.set("page", "1");
    router.push(`/admin/reports?${params.toString()}`);
  };

  // 처리 결과 즉시 반영
  // 모달 처리 직후 현재 탭 기준에 맞춰 목록을 갱신해 운영 피드백 지연 최소화
  const handleSuccess = (
    id: number,
    status: string,
    comment: string,
    strikeDelta: number
  ) => {
    setReports((prev) => {
      // 현재 탭 불일치 항목 제거
      // 예: 대기 탭에서 처리 완료된 신고는 서버 재조회 전에도 바로 목록에서 제거
      if (currentStatus !== "ALL" && currentStatus !== status) {
        return prev.filter((report) => report.id !== id);
      }

      return prev.map((report) =>
        report.id === id
          ? {
              ...report,
              status,
              adminComment: comment,
              recentStrikeTotal: (report.recentStrikeTotal ?? 0) + strikeDelta,
            }
          : report
      );
    });
  };

  const handleDialogClose = () => {
    setSelectedReportId(null);
    if (!searchParams.get("open")) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("open");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  return (
    <div className="space-y-6">
      <AdminSearchBar placeholder="대상명, 신고자, 사유, 설명, ID 검색" />

      {/* 탭 필터 */}
      <div className="flex gap-2 border-b border-border-subtle overflow-x-auto scrollbar-hide">
        {["PENDING", "RESOLVED", "DISMISSED", "ALL"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              "focus-ring-soft rounded-t-lg px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
              currentStatus === tab
                ? "border-brand text-brand dark:text-brand-light"
                : "border-transparent text-muted hover:text-primary"
            )}
          >
            {tab === "PENDING"
              ? "대기 중"
              : tab === "RESOLVED"
                ? "처리됨"
                : tab === "DISMISSED"
                  ? "기각됨"
                  : "전체"}
          </button>
        ))}
      </div>

      <div className="space-y-4 xl:hidden">
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-16 text-center text-sm text-muted shadow-sm">
            {hasQuery
              ? "검색 조건에 맞는 신고가 없습니다."
              : "신고 내역이 없습니다."}
          </div>
        ) : (
          reports.map((report) => {
            const targetHref = getTargetUrl(report, returnTo);
            const isInternalTarget = targetHref?.startsWith("/admin");
            const targetLabel = getReportTargetLabel(report);
            const targetParentLabel = getReportTargetParentLabel(report);

            return (
              <article
                key={report.id}
                className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReportStatusBadge status={report.status} />
                      <span className="rounded-full bg-surface-dim px-2 py-1 text-xs font-bold text-primary">
                        {REPORT_REASON_LABELS[report.reason]}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {report.targetPreview ? (
                        <p
                          className="line-clamp-2 text-sm font-bold leading-5 text-primary"
                          title={report.targetPreview}
                        >
                          {report.targetPreview}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-surface-dim px-2 py-1 text-xs font-mono text-muted">
                          {targetLabel} #{getReportTargetId(report)}
                        </span>
                        {targetHref ? (
                          <Link
                            href={targetHref}
                            prefetch={false}
                            target={isInternalTarget ? undefined : "_blank"}
                            rel={
                              isInternalTarget
                                ? undefined
                                : "noopener noreferrer"
                            }
                            className="focus-ring-soft rounded text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
                          >
                            <ArrowTopRightOnSquareIcon className="size-4" />
                          </Link>
                        ) : (
                          <span className="rounded-full bg-surface-dim px-2 py-1 text-xs font-medium text-muted">
                            단독 상세 없음
                          </span>
                        )}
                      </div>
                      {report.targetResolvedUsername &&
                      getReportTargetType(report) !== "USER" ? (
                        <p className="text-xs leading-5 text-muted">
                          작성자 {report.targetResolvedUsername} #
                          {report.targetResolvedUserId}
                        </p>
                      ) : null}
                      {targetParentLabel && report.targetParentPreview ? (
                        <p className="text-xs leading-5 text-muted">
                          {targetParentLabel}: {report.targetParentPreview}
                        </p>
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-bold",
                          (report.recentStrikeTotal ?? 0) > 0
                            ? "bg-danger/10 text-danger"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        최근 90일 strike {report.recentStrikeTotal ?? 0}회
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReportId(report.id)}
                    className="focus-ring-strong shrink-0 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                  >
                    {report.status === "PENDING" ? "처리하기" : "내역보기"}
                  </button>
                </div>

                <div className="mt-4 rounded-xl bg-surface-dim/30 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    신고 내용
                  </p>
                  <p className="mt-2 text-sm leading-6 text-primary">
                    {report.description || "-"}
                  </p>
                  {report.adminComment ? (
                    <div className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs leading-5 text-primary">
                      {report.adminComment}
                    </div>
                  ) : null}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-dim/30 px-3 py-3">
                  <div className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      신고자
                    </dt>
                    <dd className="mt-1 flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-primary">
                        {report.reporter.username}
                      </span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-mono text-muted">
                        #{report.reporter.id}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      접수 일시
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-primary">
                      <TimeAgo date={report.created_at} />
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm xl:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border-subtle">
              <tr>
                <th className="px-6 py-4 w-20">상태</th>
                <th className="px-6 py-4 w-32">사유</th>
                <th className="px-6 py-4 w-64">대상</th>
                <th className="px-6 py-4">설명</th>
                <th className="px-6 py-4 w-32">신고자</th>
                <th className="px-6 py-4 w-32">일시</th>
                <th className="px-6 py-4 w-24 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted">
                    {hasQuery
                      ? "검색 조건에 맞는 신고가 없습니다."
                      : "신고 내역이 없습니다."}
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const targetHref = getTargetUrl(report, returnTo);
                  const isInternalTarget = targetHref?.startsWith("/admin");
                  const targetLabel = getReportTargetLabel(report);
                  const targetParentLabel = getReportTargetParentLabel(report);

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-surface-dim/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <ReportStatusBadge status={report.status} />
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">
                        {REPORT_REASON_LABELS[report.reason]}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {report.targetPreview ? (
                            <span
                              className="max-w-64 truncate font-bold text-primary"
                              title={report.targetPreview}
                            >
                              {report.targetPreview}
                            </span>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <span className="bg-surface-dim px-2 py-1 rounded text-xs font-mono text-muted">
                              {targetLabel} #{getReportTargetId(report)}
                            </span>
                            {targetHref && (
                              <Link
                                href={targetHref}
                                prefetch={false}
                                target={isInternalTarget ? undefined : "_blank"}
                                rel={
                                  isInternalTarget
                                    ? undefined
                                    : "noopener noreferrer"
                                }
                                className="focus-ring-soft rounded text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
                              >
                                <ArrowTopRightOnSquareIcon className="size-4" />
                              </Link>
                            )}
                            {!getTargetUrl(report, returnTo) && (
                              <span className="rounded-full bg-surface-dim px-2 py-1 text-xs font-medium text-muted">
                                단독 상세 없음
                              </span>
                            )}
                          </div>
                          {report.targetResolvedUsername &&
                          getReportTargetType(report) !== "USER" ? (
                            <span className="text-xs leading-5 text-muted">
                              작성자 {report.targetResolvedUsername} #
                              {report.targetResolvedUserId}
                            </span>
                          ) : null}
                          {targetParentLabel && report.targetParentPreview ? (
                            <span className="text-xs leading-5 text-muted">
                              {targetParentLabel}: {report.targetParentPreview}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-bold",
                              (report.recentStrikeTotal ?? 0) > 0
                                ? "bg-danger/10 text-danger"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            최근 90일 strike {report.recentStrikeTotal ?? 0}회
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-muted">
                        <div className="space-y-1">
                          <div className="truncate">
                            {report.description || "-"}
                          </div>
                          {report.adminComment && (
                            <div className="rounded-lg bg-surface-dim/60 px-3 py-2 text-xs text-primary whitespace-pre-line">
                              {report.adminComment}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-primary">
                            {report.reporter.username}
                          </span>
                          <span className="rounded-full bg-surface-dim px-2 py-0.5 text-xs font-mono text-muted">
                            #{report.reporter.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        <TimeAgo date={report.created_at} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedReportId(report.id)}
                          className="focus-ring-soft rounded px-1 py-0.5 text-xs font-bold text-brand hover:underline dark:text-brand-light"
                        >
                          {report.status === "PENDING"
                            ? "처리하기"
                            : "내역보기"}
                        </button>
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

      {selectedReportId && (
        <ReportActionDialog
          open={!!selectedReportId}
          onClose={handleDialogClose}
          reportId={selectedReportId}
          reportReason={selectedReport?.reason as ReportReason}
          currentStrikeTotal={selectedReport?.recentStrikeTotal ?? 0}
          reporterUsername={selectedReport?.reporter.username}
          reportDescription={selectedReport?.description ?? null}
          targetLabel={
            selectedReport ? getReportTargetLabel(selectedReport) : undefined
          }
          targetId={
            selectedReport ? getReportTargetId(selectedReport) : undefined
          }
          targetPreview={selectedReport?.targetPreview ?? null}
          targetParentLabel={
            selectedReport
              ? getReportTargetParentLabel(selectedReport)
              : undefined
          }
          targetParentId={
            selectedReport ? getReportTargetParentId(selectedReport) : null
          }
          targetParentPreview={selectedReport?.targetParentPreview ?? null}
          targetResolvedUserId={selectedReport?.targetResolvedUserId ?? null}
          targetResolvedUsername={
            selectedReport?.targetResolvedUsername ?? null
          }
          targetUrl={
            selectedReport ? getDirectTargetUrl(selectedReport, returnTo) : null
          }
          targetParentUrl={
            selectedReport
              ? getParentContextUrl(selectedReport, returnTo)
              : null
          }
          targetType={
            selectedReport ? getReportTargetType(selectedReport) : undefined
          }
          reportStatus={selectedReport?.status}
          existingAdminComment={selectedReport?.adminComment ?? null}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
