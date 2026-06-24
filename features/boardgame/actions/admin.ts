/**
 * File Name : features/boardgame/actions/admin.ts
 * Description : 관리자 보드게임 카탈로그 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   보드게임 import, 목록 조회, 한국어 locale 저장 액션 추가
 * 2026.04.28  임도헌   Modified  BGG API import 액션을 Kaggle CSV import 액션으로 전환
 * 2026.04.29  임도헌   Modified  Kaggle CSV 파일 검증 흐름 주석 정리
 * 2026.04.29  임도헌   Modified  한국어 locale CSV import 액션 추가
 * 2026.04.29  임도헌   Modified  공개 가능한 한국어 locale 일괄 공개 액션 추가
 * 2026.04.30  임도헌   Modified  검증된 메커니즘 CSV import 액션 추가
 * 2026.05.02  임도헌   Modified  분류 한국어 표시명 CSV import 액션 추가
 * 2026.05.03  임도헌   Modified  검증된 카테고리 CSV import 액션 추가
 */

"use server";

import { revalidatePath } from "next/cache";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { getBoardGamesAdmin } from "@/features/boardgame/service/adminQuery/list";
import {
  publishReadyBoardGameLocales,
  saveBoardGameKoreanLocale,
} from "@/features/boardgame/service/adminLocale";
import { importBoardGameCategoriesFromCsv } from "@/features/boardgame/service/adminImport/categoryCsv";
import { importBoardGameKoreanLocalesFromCsv } from "@/features/boardgame/service/adminImport/localeCsv";
import { importBoardGameMechanicsFromCsv } from "@/features/boardgame/service/adminImport/mechanicCsv";
import { importBoardGamesFromKaggleCsv } from "@/features/boardgame/service/adminImport/metadataCsv";
import { importBoardGameTaxonomyKoreanNamesFromCsv } from "@/features/boardgame/service/adminImport/taxonomyNameCsv";
import { boardGameKoreanLocaleSchema } from "@/features/boardgame/schemas";
import type { ServiceResult } from "@/lib/types";
import type {
  BoardGameAdminListResponse,
  BoardGameCategoriesCsvImportSummary,
  BoardGameCsvImportSummary,
  BoardGameLocaleBulkPublishSummary,
  BoardGameLocaleCsvImportSummary,
  BoardGameMechanicsCsvImportSummary,
  BoardGameTaxonomyKoreanNameCsvImportSummary,
} from "@/features/boardgame/types/admin";
import type { BoardGameLocaleStatus } from "@/generated/prisma/enums";

/**
 * 관리자 보드게임 목록 조회 Action
 *
 * @param page - 현재 페이지 번호
 * @param query - BGG ID, 원제, 한국어 제목 검색어
 * @returns {Promise<ServiceResult<BoardGameAdminListResponse>>} 보드게임 관리자 목록 결과
 */
export async function getBoardGamesAdminAction(
  page: number,
  query?: string
): Promise<ServiceResult<BoardGameAdminListResponse>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  return getBoardGamesAdmin(page, 20, query);
}

/**
 * Kaggle CSV 기반 보드게임 import Action
 *
 * @param formData - Kaggle CSV 파일을 포함한 form data
 * @returns {Promise<ServiceResult<BoardGameCsvImportSummary>>} import 처리 요약
 */
export async function importBoardGamesFromKaggleCsvAdminAction(
  formData: FormData
): Promise<ServiceResult<BoardGameCsvImportSummary>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  const csvFile = formData.get("csvFile");
  if (!isTextFile(csvFile)) {
    return { success: false, error: "Kaggle CSV 파일을 선택해주세요." };
  }
  if (csvFile.size === 0) {
    return { success: false, error: "비어 있지 않은 CSV 파일을 선택해주세요." };
  }

  const result = await importBoardGamesFromKaggleCsv(await csvFile.text());

  if (result.success) {
    revalidatePath("/admin/boardgames");
    revalidatePath("/boardgames");
  }

  return result;
}

/**
 * 한국어 locale CSV import Action
 *
 * @param formData - boardgames-ko CSV 파일을 포함한 form data
 * @returns {Promise<ServiceResult<BoardGameLocaleCsvImportSummary>>} locale import 처리 요약
 */
export async function importBoardGameKoreanLocalesFromCsvAdminAction(
  formData: FormData
): Promise<ServiceResult<BoardGameLocaleCsvImportSummary>> {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const csvFile = formData.get("localeCsvFile");
  if (!isTextFile(csvFile)) {
    return {
      success: false,
      error: "한국어 보드게임 CSV 파일을 선택해주세요.",
    };
  }
  if (csvFile.size === 0) {
    return { success: false, error: "비어 있지 않은 CSV 파일을 선택해주세요." };
  }

  const result = await importBoardGameKoreanLocalesFromCsv(
    auth.adminId,
    await csvFile.text()
  );

  if (result.success) {
    revalidatePath("/admin/boardgames");
    revalidatePath("/boardgames");
  }

  return result;
}

/**
 * 검증된 메커니즘 CSV import Action
 *
 * @param formData - boardgame mechanics CSV 파일을 포함한 form data
 * @returns {Promise<ServiceResult<BoardGameMechanicsCsvImportSummary>>} 메커니즘 연결 처리 요약
 */
export async function importBoardGameMechanicsFromCsvAdminAction(
  formData: FormData
): Promise<ServiceResult<BoardGameMechanicsCsvImportSummary>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  const csvFile = formData.get("mechanicsCsvFile");
  if (!isTextFile(csvFile)) {
    return { success: false, error: "메커니즘 CSV 파일을 선택해주세요." };
  }
  if (csvFile.size === 0) {
    return { success: false, error: "비어 있지 않은 CSV 파일을 선택해주세요." };
  }

  const result = await importBoardGameMechanicsFromCsv(await csvFile.text());

  if (result.success) {
    revalidatePath("/admin/boardgames");
    revalidatePath("/boardgames");
  }

  return result;
}

/**
 * 검증된 카테고리 CSV import Action
 *
 * @param formData - boardgame categories CSV 파일을 포함한 form data
 * @returns {Promise<ServiceResult<BoardGameCategoriesCsvImportSummary>>} 카테고리 연결 처리 요약
 */
export async function importBoardGameCategoriesFromCsvAdminAction(
  formData: FormData
): Promise<ServiceResult<BoardGameCategoriesCsvImportSummary>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  const csvFile = formData.get("categoriesCsvFile");
  if (!isTextFile(csvFile)) {
    return { success: false, error: "카테고리 CSV 파일을 선택해주세요." };
  }
  if (csvFile.size === 0) {
    return { success: false, error: "비어 있지 않은 CSV 파일을 선택해주세요." };
  }

  const result = await importBoardGameCategoriesFromCsv(await csvFile.text());

  if (result.success) {
    revalidatePath("/admin/boardgames");
    revalidatePath("/boardgames");
  }

  return result;
}

/**
 * 분류 한국어 표시명 CSV import Action
 *
 * @param formData - boardgame taxonomy koName CSV 파일을 포함한 form data
 * @returns {Promise<ServiceResult<BoardGameTaxonomyKoreanNameCsvImportSummary>>} 분류 표시명 import 처리 요약
 */
export async function importBoardGameTaxonomyKoreanNamesFromCsvAdminAction(
  formData: FormData
): Promise<ServiceResult<BoardGameTaxonomyKoreanNameCsvImportSummary>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  const csvFile = formData.get("taxonomyKoCsvFile");
  if (!isTextFile(csvFile)) {
    return { success: false, error: "분류 한국어명 CSV 파일을 선택해주세요." };
  }
  if (csvFile.size === 0) {
    return { success: false, error: "비어 있지 않은 CSV 파일을 선택해주세요." };
  }

  const result = await importBoardGameTaxonomyKoreanNamesFromCsv(
    await csvFile.text()
  );

  if (result.success) {
    revalidatePath("/admin/boardgames");
    revalidatePath("/boardgames");
  }

  return result;
}

/**
 * 공개 가능한 한국어 locale 일괄 공개 Action
 *
 * @returns {Promise<ServiceResult<BoardGameLocaleBulkPublishSummary>>} 일괄 공개 처리 요약
 */
export async function publishReadyBoardGameLocalesAdminAction(): Promise<
  ServiceResult<BoardGameLocaleBulkPublishSummary>
> {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const result = await publishReadyBoardGameLocales(auth.adminId);

  if (result.success) {
    revalidatePath("/admin/boardgames");
    revalidatePath("/boardgames");
  }

  return result;
}

/**
 * FormData entry가 업로드된 CSV/text 파일인지 확인
 *
 * @param value - FormData에서 읽은 file entry
 * @returns File 객체 여부
 */
function isTextFile(value: FormDataEntryValue | null): value is File {
  // Server Action의 FormData 값은 문자열일 수도 있으므로 File-like 객체인지 좁혀서 확인
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "function" &&
    "size" in value &&
    typeof value.size === "number"
  );
}

/**
 * 한국어 보드게임 표시 정보 저장 Action
 *
 * @param boardGameId - 보드게임 ID
 * @param input - 한국어 제목/별칭/설명/공개 상태
 * @returns {Promise<ServiceResult<{ id: number; status: BoardGameLocaleStatus }>>} 저장 결과
 */
export async function saveBoardGameKoreanLocaleAdminAction(
  boardGameId: number,
  input: unknown
): Promise<ServiceResult<{ id: number; status: BoardGameLocaleStatus }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const parsed = boardGameKoreanLocaleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const result = await saveBoardGameKoreanLocale(
    auth.adminId,
    boardGameId,
    parsed.data
  );

  if (result.success) {
    revalidatePath("/admin/boardgames");
    revalidatePath("/boardgames");
    revalidatePath(`/boardgames/${boardGameId}`);
  }

  return result;
}
