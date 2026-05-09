/**
 * File Name : features/boardgame/constants.ts
 * Description : 보드게임 카탈로그 도메인 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   보드게임 import 처리 제한 상수 분리
 * 2026.05.05  임도헌   Modified  관리자 CSV 저장 transaction 상수 추가
 * 2026.05.08  임도헌   Modified  공개 도감 페이지당 표시 개수 상수 추가
 */

export const MAX_BOARDGAME_CSV_IMPORT_ROWS = 1000;
export const BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE = 10;
export const BOARDGAME_IMPORT_TRANSACTION_TIMEOUT_MS = 30_000;
export const BOARDGAME_CATALOG_PAGE_SIZE = 24;
