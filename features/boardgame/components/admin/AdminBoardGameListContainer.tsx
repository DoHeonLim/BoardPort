/**
 * File Name : features/boardgame/components/admin/AdminBoardGameListContainer.tsx
 * Description : 관리자 보드게임 카탈로그 import 및 한국어 검수 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   보드게임 import와 한국어 locale 수동 저장 화면 추가
 * 2026.04.28  임도헌   Modified  BGG API 호출 UI를 Kaggle CSV 파일 import UI로 전환
 * 2026.04.29  임도헌   Modified  Kaggle CSV 검수 흐름과 인기도 메타데이터 표시 주석 정리
 * 2026.04.29  임도헌   Modified  공개 상태 전환 조건 안내와 CSV list 입력 정규화 주석 보강
 * 2026.04.29  임도헌   Modified  한국어 locale CSV import UI 추가
 * 2026.04.29  임도헌   Modified  공개 가능한 한국어 locale 일괄 공개 버튼 추가
 * 2026.04.29  임도헌   Modified  일괄 공개 확인을 공용 ConfirmDialog로 통일
 * 2026.04.30  임도헌   Modified  검증된 메커니즘 CSV import UI 추가
 * 2026.05.02  임도헌   Modified  분류 한국어 표시명 CSV import UI 추가
 * 2026.05.02  임도헌   Modified  대량 seed CSV import 기준 안내 문구 업데이트
 * 2026.05.03  임도헌   Modified  CSV import 처리 중 상태 표시 추가
 * 2026.05.03  임도헌   Modified  검증된 카테고리 CSV import UI 추가
 * 2026.05.03  임도헌   Modified  관리자 import 권장 순서에 맞게 섹션 배치 조정
 * 2026.05.03  임도헌   Modified  CSV import 파일 선택/실행 버튼 폭 통일
 * 2026.05.05  임도헌   Modified  import 섹션과 locale 편집 목록을 전용 컴포넌트로 분리
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import AdminSearchBar from "@/features/report/components/admin/AdminSearchBar";
import AdminBoardGameEditableList from "@/features/boardgame/components/admin/AdminBoardGameEditableList";
import AdminBoardGameImportSections from "@/features/boardgame/components/admin/AdminBoardGameImportSections";
import {
  IMPORT_PROGRESS_LABELS,
  type ImportProgressKind,
  type ImportProgressState,
} from "@/features/boardgame/components/admin/ImportProgressPanel";
import {
  importBoardGameCategoriesFromCsvAdminAction,
  importBoardGameKoreanLocalesFromCsvAdminAction,
  importBoardGameMechanicsFromCsvAdminAction,
  importBoardGameTaxonomyKoreanNamesFromCsvAdminAction,
  importBoardGamesFromKaggleCsvAdminAction,
  publishReadyBoardGameLocalesAdminAction,
  saveBoardGameKoreanLocaleAdminAction,
} from "@/features/boardgame/actions/admin";
import { BoardGameLocaleStatus } from "@/generated/prisma/enums";
import type { BoardGameAdminListResponse } from "@/features/boardgame/types/admin";

interface AdminBoardGameListContainerProps {
  data: BoardGameAdminListResponse;
}

/**
 * 관리자 보드게임 카탈로그 컨테이너
 *
 * Server Action 호출과 toast/refresh 상태만 소유하고, 실제 import 폼과 locale 편집 목록은 하위 컴포넌트로 분리
 *
 * @param props - 관리자 보드게임 목록과 페이지네이션 메타
 * @returns 관리자 보드게임 import/검수 UI
 */
export default function AdminBoardGameListContainer({
  data,
}: AdminBoardGameListContainerProps) {
  const router = useRouter();
  const [isImportPending, startImportTransition] = useTransition();
  const [isLocaleImportPending, startLocaleImportTransition] = useTransition();
  const [isCategoriesImportPending, startCategoriesImportTransition] =
    useTransition();
  const [isMechanicsImportPending, startMechanicsImportTransition] =
    useTransition();
  const [isTaxonomyKoImportPending, startTaxonomyKoImportTransition] =
    useTransition();
  const [isBulkPublishPending, startBulkPublishTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();
  const [bulkPublishConfirmOpen, setBulkPublishConfirmOpen] = useState(false);
  const [importProgress, setImportProgress] =
    useState<ImportProgressState | null>(null);

  /**
   * CSV import 처리 상태 시작
   *
   * Server Action은 중간 row 처리 상태를 스트리밍하지 않으므로, 클라이언트에서는 작업 종류와 대기 상태만 표시
   */
  const startImportProgress = (kind: ImportProgressKind) => {
    setImportProgress({
      kind,
      status: "running",
      message: IMPORT_PROGRESS_LABELS[kind],
    });
  };

  /**
   * CSV import 처리 상태 종료
   *
   * 성공/실패 결과를 잠시 유지해 관리자가 버튼 비활성화만 보고 기다리지 않도록 하고, 1.2초 후에 상태 초기화해 다음 작업을 받을 준비
   */
  const finishImportProgress = (
    status: "success" | "error",
    message: string
  ) => {
    setImportProgress((current) =>
      current
        ? {
            ...current,
            status,
            message,
          }
        : current
    );

    window.setTimeout(() => {
      setImportProgress(null);
    }, 1200);
  };

  /**
   * Kaggle 원천 메타데이터 CSV import를 실행
   *
   * @param formData - 원천 메타데이터 CSV 파일 FormData
   */
  const handleImport = (formData: FormData) => {
    startImportProgress("metadata");

    startImportTransition(async () => {
      const result = await importBoardGamesFromKaggleCsvAdminAction(formData);

      if (!result.success) {
        finishImportProgress("error", "원천 메타데이터 저장 실패");
        toast.error(result.error);
        return;
      }

      // CSV에는 한 번에 많은 행이 들어올 수 있으므로 서버 제한 여부를 toast에 같이 안내
      const suffix = result.data.truncated
        ? " 1회 최대 import 행 수까지만 반영했습니다."
        : "";
      toast.success(
        `${result.data.imported}개 가져오기 완료 (신규 ${result.data.created}개, 갱신 ${result.data.updated}개).${suffix}`
      );
      router.refresh();
      finishImportProgress("success", "원천 메타데이터 저장 완료");
    });
  };

  /**
   * 한국어 검수 locale CSV import를 실행
   *
   * @param formData - 한국어 locale CSV 파일 FormData
   */
  const handleLocaleImport = (formData: FormData) => {
    startImportProgress("locale");

    startLocaleImportTransition(async () => {
      const result =
        await importBoardGameKoreanLocalesFromCsvAdminAction(formData);

      if (!result.success) {
        finishImportProgress("error", "한국어 검수 정보 반영 실패");
        toast.error(result.error);
        return;
      }

      const skippedText = result.data.skipped
        ? `, 스킵 ${result.data.skipped}개`
        : "";
      toast.success(
        `${result.data.imported}개 한국어 정보 반영 완료 (신규 ${result.data.created}개, 갱신 ${result.data.updated}개${skippedText}).`
      );
      router.refresh();
      finishImportProgress("success", "한국어 검수 정보 반영 완료");
    });
  };

  /**
   * 검증된 메커니즘 relation CSV import를 실행
   *
   * @param formData - 메커니즘 CSV 파일 FormData
   */
  const handleMechanicsImport = (formData: FormData) => {
    startImportProgress("mechanics");

    startMechanicsImportTransition(async () => {
      const result = await importBoardGameMechanicsFromCsvAdminAction(formData);

      if (!result.success) {
        finishImportProgress("error", "메커니즘 연결 실패");
        toast.error(result.error);
        return;
      }

      const skippedText = result.data.skipped
        ? `, 제외 ${result.data.skipped}행`
        : "";
      toast.success(
        `${result.data.connectedGames}개 게임에 ${result.data.connectedMechanics}개 메커니즘 연결 완료${skippedText}.`
      );
      router.refresh();
      finishImportProgress("success", "메커니즘 연결 완료");
    });
  };

  /**
   * 검증된 카테고리 relation CSV import를 실행
   *
   * @param formData - 카테고리 CSV 파일 FormData
   */
  const handleCategoriesImport = (formData: FormData) => {
    startImportProgress("categories");

    startCategoriesImportTransition(async () => {
      const result =
        await importBoardGameCategoriesFromCsvAdminAction(formData);

      if (!result.success) {
        finishImportProgress("error", "카테고리 연결 실패");
        toast.error(result.error);
        return;
      }

      const skippedText = result.data.skipped
        ? `, 제외 ${result.data.skipped}행`
        : "";
      toast.success(
        `${result.data.connectedGames}개 게임에 ${result.data.connectedCategories}개 카테고리 연결 완료${skippedText}.`
      );
      router.refresh();
      finishImportProgress("success", "카테고리 연결 완료");
    });
  };

  /**
   * taxonomy 한국어 표시명 CSV import를 실행
   *
   * @param formData - taxonomy-ko CSV 파일 FormData
   */
  const handleTaxonomyKoImport = (formData: FormData) => {
    startImportProgress("taxonomy");

    startTaxonomyKoImportTransition(async () => {
      const result =
        await importBoardGameTaxonomyKoreanNamesFromCsvAdminAction(formData);

      if (!result.success) {
        finishImportProgress("error", "분류 한국어명 반영 실패");
        toast.error(result.error);
        return;
      }

      const skippedText = result.data.skipped
        ? `, 스킵 ${result.data.skipped}개`
        : "";
      toast.success(
        `${result.data.updated}개 분류 한국어명 반영 완료${skippedText}.`
      );
      router.refresh();
      finishImportProgress("success", "분류 한국어명 반영 완료");
    });
  };

  /**
   * 공개 가능한 한국어 locale 일괄 공개 실행
   *
   * 서버에서는 짧은 설명이 있는 초안/검수 완료 항목만 공개 처리하므로, 빈 설명 항목은 여기서도 노출되지 않음
   */
  const confirmBulkPublish = () => {
    startBulkPublishTransition(async () => {
      const result = await publishReadyBoardGameLocalesAdminAction();

      if (!result.success) {
        toast.error(result.error);
        setBulkPublishConfirmOpen(false);
        return;
      }

      toast.success(`${result.data.published}개 보드게임을 공개했습니다.`);
      setBulkPublishConfirmOpen(false);
      router.refresh();
    });
  };

  /**
   * 단일 보드게임의 한국어 locale 편집 내용을 저장
   *
   * @param boardGameId - 저장할 BoardGame id
   * @param formData - locale 편집 form data
   */
  const handleSave = (boardGameId: number, formData: FormData) => {
    // CSV/Sheets 검수값을 한 항목씩 보정할 수 있도록 form 값을 서버 스키마 입력 형태로 정규화
    const payload = {
      title: String(formData.get("title") ?? ""),
      aliases: splitListInput(String(formData.get("aliases") ?? "")),
      shortDescription: String(formData.get("shortDescription") ?? ""),
      searchKeywords: splitListInput(
        String(formData.get("searchKeywords") ?? "")
      ),
      status: String(formData.get("status") ?? BoardGameLocaleStatus.DRAFT),
    };

    startSaveTransition(async () => {
      const result = await saveBoardGameKoreanLocaleAdminAction(
        boardGameId,
        payload
      );

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("한국어 보드게임 정보를 저장했습니다.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <AdminBoardGameImportSections
        isImportPending={isImportPending}
        isLocaleImportPending={isLocaleImportPending}
        isCategoriesImportPending={isCategoriesImportPending}
        isMechanicsImportPending={isMechanicsImportPending}
        isTaxonomyKoImportPending={isTaxonomyKoImportPending}
        isBulkPublishPending={isBulkPublishPending}
        importProgress={importProgress}
        onImport={handleImport}
        onLocaleImport={handleLocaleImport}
        onCategoriesImport={handleCategoriesImport}
        onMechanicsImport={handleMechanicsImport}
        onTaxonomyKoImport={handleTaxonomyKoImport}
        onBulkPublish={() => setBulkPublishConfirmOpen(true)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearchBar placeholder="BGG ID, 원제, 한국어 제목 검색" />
        <p className="text-sm font-medium text-muted">총 {data.total}개</p>
      </div>

      <AdminBoardGameEditableList
        items={data.items}
        isSavePending={isSavePending}
        onSave={handleSave}
      />

      <AdminPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />

      <ConfirmDialog
        open={bulkPublishConfirmOpen}
        title="설명 있는 보드게임을 모두 공개할까요?"
        description={
          <span>
            짧은 설명이 있는 초안/검수 완료 항목만 공개 상태로 변경합니다.
            설명이 비어 있거나 보관된 항목은 공개하지 않습니다.
          </span>
        }
        confirmLabel="전체 공개"
        cancelLabel="취소"
        confirmVariant="primary"
        loading={isBulkPublishPending}
        onConfirm={confirmBulkPublish}
        onCancel={() => setBulkPublishConfirmOpen(false)}
      />
    </div>
  );
}

/**
 * 관리자 입력창의 쉼표/파이프/줄바꿈 구분 목록을 문자열 배열로 정규화
 *
 * @param value - aliases 또는 searchKeywords 입력값
 * @returns 중복과 빈 값을 제거한 문자열 배열
 */
function splitListInput(value: string): string[] {
  // Google Sheets/CSV 검수본을 붙여넣기 쉽도록 파이프, 쉼표, 줄바꿈을 모두 구분자로 허용
  return Array.from(
    new Set(
      value
        .split(/[|,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}
