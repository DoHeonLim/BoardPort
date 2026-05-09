/**
 * File Name : features/boardgame/service/adminImport/taxonomy.ts
 * Description : 관리자 보드게임 import taxonomy 동기화 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.29  임도헌   Created   CSV import transaction timeout 방지를 위한 taxonomy 사전 동기화 추가
 * 2026.04.30  임도헌   Modified  메커니즘 CSV import용 taxonomy 동기화 추가
 * 2026.05.03  임도헌   Modified  카테고리 CSV import용 taxonomy 동기화 추가
 * 2026.05.05  임도헌   Modified  카테고리/메커니즘 사전 동기화와 ID lookup helper 분리
 */

import "server-only";
import db from "@/lib/db";
import { BoardGameTaxonomyType } from "@/generated/prisma/enums";
import { slugifyTaxonomy } from "@/features/boardgame/utils/importHelpers";
import type {
  BoardGameCategoriesImportPayload,
  BoardGameMechanicsImportPayload,
  BoardGameMetadataImportPayload,
  BoardGameTaxonomyItem,
  BoardGameTaxonomyKoreanNameImportPayload,
} from "@/features/boardgame/types/import";

/**
 * raw 메타데이터 CSV taxonomy 후보의 사전 생성 및 ID lookup map 반환
 *
 * 원천 CSV import는 BoardGame 저장 전에 relation 연결 ID가 필요하므로,
 * taxonomy upsert를 본문 transaction 밖에서 먼저 처리해 interactive transaction 시간 축소
 *
 * @param items - Kaggle raw CSV에서 정규화한 보드게임 메타데이터 목록
 * @returns type+bggName 기준 taxonomy ID map
 */
export async function syncTaxonomies(
  items: BoardGameMetadataImportPayload[]
): Promise<Map<string, number>> {
  const taxonomyCandidates = new Map<
    string,
    {
      type: BoardGameTaxonomyType;
      bggName: string;
      slug: string;
    }
  >();

  // BGG 원문명은 taxonomy 매칭 키로 계속 쓰이므로 koName 보강과 별도 보존
  items.forEach((item) => {
    collectTaxonomyCandidates(
      taxonomyCandidates,
      BoardGameTaxonomyType.CATEGORY,
      item.categories
    );
    collectTaxonomyCandidates(
      taxonomyCandidates,
      BoardGameTaxonomyType.MECHANIC,
      item.mechanics
    );
  });

  return createAndLoadTaxonomyIds(Array.from(taxonomyCandidates.values()));
}

/**
 * 검증된 mechanics CSV에 등장한 MECHANIC taxonomy 사전 동기화
 *
 * @param items - bggId 기준 검증 완료 메커니즘 목록
 * @returns MECHANIC 원문명 기준 taxonomy ID map
 */
export async function syncMechanicTaxonomies(
  items: BoardGameMechanicsImportPayload[]
): Promise<Map<string, number>> {
  const taxonomyCandidates = new Map<
    string,
    {
      type: BoardGameTaxonomyType;
      bggName: string;
      slug: string;
    }
  >();

  // 메커니즘 CSV는 별도 검수 원장이므로 CATEGORY 후보 제외, MECHANIC만 동기화
  items.forEach((item) => {
    collectTaxonomyCandidates(
      taxonomyCandidates,
      BoardGameTaxonomyType.MECHANIC,
      item.mechanics
    );
  });

  return createAndLoadTaxonomyIds(Array.from(taxonomyCandidates.values()));
}

/**
 * 검증된 categories CSV에 등장한 CATEGORY taxonomy 사전 동기화
 *
 * @param items - bggId 기준 검증 완료 카테고리 목록
 * @returns CATEGORY 원문명 기준 taxonomy ID map
 */
export async function syncCategoryTaxonomies(
  items: BoardGameCategoriesImportPayload[]
): Promise<Map<string, number>> {
  const taxonomyCandidates = new Map<
    string,
    {
      type: BoardGameTaxonomyType;
      bggName: string;
      slug: string;
    }
  >();

  // 카테고리 CSV는 별도 검수 원장이므로 MECHANIC 후보 제외, CATEGORY만 동기화
  items.forEach((item) => {
    collectTaxonomyCandidates(
      taxonomyCandidates,
      BoardGameTaxonomyType.CATEGORY,
      item.categories
    );
  });

  return createAndLoadTaxonomyIds(Array.from(taxonomyCandidates.values()));
}

/**
 * taxonomy 이름 목록을 DB relation 연결에 필요한 ID 목록으로 변환
 *
 * @param taxonomyIdMap - type+bggName 기준 taxonomy ID map
 * @param type - CATEGORY 또는 MECHANIC
 * @param items - CSV에서 정규화한 taxonomy item 목록
 * @returns DB에 존재하는 taxonomy ID 목록
 */
export function getTaxonomyIds(
  taxonomyIdMap: Map<string, number>,
  type: BoardGameTaxonomyType,
  items: BoardGameTaxonomyItem[]
): number[] {
  return items.flatMap((item) => {
    const id = taxonomyIdMap.get(taxonomyKey(type, item.name));
    return id ? [id] : [];
  });
}

/**
 * taxonomy 한국어명 CSV 검증을 위해 type별 원문명을 추출
 *
 * @param items - type, bggName, koName CSV payload
 * @param type - CATEGORY 또는 MECHANIC
 * @returns 해당 type에 속한 BGG 원문 taxonomy 이름 목록
 */
export function getTaxonomyNamesByType(
  items: BoardGameTaxonomyKoreanNameImportPayload[],
  type: BoardGameTaxonomyType
): string[] {
  return items
    .filter((item) => item.type === type)
    .map((item) => item.bggName);
}

/**
 * CATEGORY와 MECHANIC의 동일 원문명 충돌 방지를 위한 type 포함 lookup key 생성
 *
 * @param type - taxonomy type
 * @param name - BGG 원문 taxonomy 이름
 * @returns taxonomy lookup key
 */
export function taxonomyKey(type: BoardGameTaxonomyType, name: string): string {
  return `${type}:${name}`;
}

/**
 * taxonomy 후보 생성 후 실제 저장 ID 재조회
 *
 * @param candidates - 중복 제거된 taxonomy 후보 목록
 * @returns type+bggName 기준 taxonomy ID map
 */
async function createAndLoadTaxonomyIds(
  candidates: Array<{
    type: BoardGameTaxonomyType;
    bggName: string;
    slug: string;
  }>
): Promise<Map<string, number>> {
  if (candidates.length === 0) return new Map();

  await db.boardGameTaxonomy.createMany({
    data: candidates,
    skipDuplicates: true,
  });

  const categoryNames = candidates
    .filter((item) => item.type === BoardGameTaxonomyType.CATEGORY)
    .map((item) => item.bggName);
  const mechanicNames = candidates
    .filter((item) => item.type === BoardGameTaxonomyType.MECHANIC)
    .map((item) => item.bggName);

  const saved = await db.boardGameTaxonomy.findMany({
    where: {
      OR: [
        ...(categoryNames.length
          ? [
              {
                type: BoardGameTaxonomyType.CATEGORY,
                bggName: { in: categoryNames },
              },
            ]
          : []),
        ...(mechanicNames.length
          ? [
              {
                type: BoardGameTaxonomyType.MECHANIC,
                bggName: { in: mechanicNames },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      type: true,
      bggName: true,
    },
  });

  return new Map(
    saved.map((item) => [taxonomyKey(item.type, item.bggName), item.id])
  );
}

/**
 * CSV 행들에서 중복 taxonomy 후보를 제거해 createMany 입력 형태로 수집
 *
 * @param candidates - type+bggName 기준 후보 map
 * @param type - CATEGORY 또는 MECHANIC
 * @param items - CSV에서 추출한 taxonomy 이름 목록
 */
function collectTaxonomyCandidates(
  candidates: Map<
    string,
    {
      type: BoardGameTaxonomyType;
      bggName: string;
      slug: string;
    }
  >,
  type: BoardGameTaxonomyType,
  items: BoardGameTaxonomyItem[]
): void {
  items.forEach((item) => {
    const key = taxonomyKey(type, item.name);
    if (candidates.has(key)) return;

    candidates.set(key, {
      type,
      bggName: item.name,
      slug: slugifyTaxonomy(item.name),
    });
  });
}
