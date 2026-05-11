/**
 * File Name : features/boardgame/components/admin/AdminBoardGameImportSections.tsx
 * Description : 관리자 보드게임 CSV import 섹션 묶음
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   보드게임 import 관련 폼 UI를 컨테이너에서 분리
 */

import ImportProgressPanel, {
  type ImportProgressState,
} from "@/features/boardgame/components/admin/ImportProgressPanel";

interface AdminBoardGameImportSectionsProps {
  isImportPending: boolean;
  isLocaleImportPending: boolean;
  isCategoriesImportPending: boolean;
  isMechanicsImportPending: boolean;
  isTaxonomyKoImportPending: boolean;
  isBulkPublishPending: boolean;
  importProgress: ImportProgressState | null;
  onImport: (formData: FormData) => void;
  onLocaleImport: (formData: FormData) => void;
  onCategoriesImport: (formData: FormData) => void;
  onMechanicsImport: (formData: FormData) => void;
  onTaxonomyKoImport: (formData: FormData) => void;
  onBulkPublish: () => void;
}

/**
 * 관리자 import 순서에 맞춘 원천/locale/mechanic/category/taxonomy-ko CSV 폼 표시
 *
 * @param props - 각 import 작업 상태와 submit handler
 * @returns 보드게임 관리자 CSV import 섹션
 */
export default function AdminBoardGameImportSections({
  isImportPending,
  isLocaleImportPending,
  isCategoriesImportPending,
  isMechanicsImportPending,
  isTaxonomyKoImportPending,
  isBulkPublishPending,
  importProgress,
  onImport,
  onLocaleImport,
  onCategoriesImport,
  onMechanicsImport,
  onTaxonomyKoImport,
  onBulkPublish,
}: AdminBoardGameImportSectionsProps) {
  const isAnyImportRunning = Boolean(importProgress);

  return (
    <section className="space-y-5 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-primary">Kaggle CSV import</h3>
          <p className="mt-1 text-sm text-muted">
            BGG 기반 Kaggle CSV에서 구조화 메타데이터만 가져오고, 한국어 설명은
            아래에서 직접 검수합니다.
          </p>
          <p className="mt-1 text-xs font-medium text-muted">
            CSV의 Description 컬럼은 저장하지 않으며, 공개 전환에는 한국어
            제목과 자체 작성 짧은 설명이 필요합니다.
          </p>
          <p className="mt-1 text-xs font-medium text-muted">
            추천 컬럼: BGGId, Name, YearPublished, MinPlayers, MaxPlayers,
            GameWeight, BayesAvgRating, NumUserRatings, BestPlayers,
            GoodPlayers, Family, Kickstarted, Rank:boardgame
          </p>
          <p className="mt-1 text-xs font-medium text-muted">
            1회 import는 최대 1,000개까지 반영됩니다. Kaggle 원본에서 필요한
            행만 추려 업로드하세요.
          </p>
        </div>

        <CsvImportForm
          fileName="csvFile"
          fileLabel="Kaggle 보드게임 CSV 파일"
          buttonLabel="가져오기"
          pendingLabel="가져오는 중"
          pending={isImportPending}
          disabled={isAnyImportRunning}
          onSubmit={onImport}
        />
      </div>

      <div className="border-t border-border-subtle pt-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-primary">
              한국어 검수 CSV import
            </h3>
            <p className="mt-1 text-sm text-muted">
              bggId 기준으로 한국어 제목, 별칭, 짧은 설명, 검색 키워드, 상태를
              일괄 반영합니다.
            </p>
            <p className="mt-1 text-xs font-medium text-muted">
              권장 컬럼: bggId, koTitle, aliases, shortDescription,
              searchKeywords, status, sourceType
            </p>
            <p className="mt-1 text-xs font-medium text-muted">
              일괄 공개는 짧은 설명이 있는 초안/검수 완료 항목만 대상으로
              합니다.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <CsvImportForm
              fileName="localeCsvFile"
              fileLabel="한국어 보드게임 검수 CSV 파일"
              buttonLabel="한국어 반영"
              pendingLabel="반영 중"
              pending={isLocaleImportPending}
              disabled={isAnyImportRunning}
              onSubmit={onLocaleImport}
            />

            <button
              type="button"
              onClick={onBulkPublish}
              disabled={isBulkPublishPending}
              className="btn-secondary min-h-11 w-full px-4 text-sm font-bold disabled:opacity-60 sm:w-auto"
            >
              {isBulkPublishPending ? "공개 중" : "설명 있는 항목 전체 공개"}
            </button>
          </div>
        </div>
      </div>

      <TaxonomyImportSection
        title="메커니즘 CSV import"
        description="bggId 기준으로 검증된 보드게임 메커니즘만 연결합니다."
        columns="권장 컬럼: bggId, primaryName, mechanicName, value, source, confidence, reviewNeeded"
        note="value=1, confidence=VERIFIED, reviewNeeded=false 행만 반영하며 추론 메커니즘은 제외합니다."
        fileName="mechanicsCsvFile"
        fileLabel="보드게임 메커니즘 CSV 파일"
        buttonLabel="메커니즘 연결"
        pendingLabel="연결 중"
        pending={isMechanicsImportPending}
        disabled={isAnyImportRunning}
        onSubmit={onMechanicsImport}
      />

      <TaxonomyImportSection
        title="카테고리 CSV import"
        description="bggId 기준으로 검증된 보드게임 카테고리 snapshot을 연결합니다."
        columns="권장 컬럼: bggId, primaryName, categoryName, categoryGroup, value, source, confidence, reviewNeeded"
        note="value=1, confidence=VERIFIED, reviewNeeded=false 행만 반영하며 기존 카테고리 연결을 교체합니다."
        fileName="categoriesCsvFile"
        fileLabel="보드게임 카테고리 CSV 파일"
        buttonLabel="카테고리 연결"
        pendingLabel="연결 중"
        pending={isCategoriesImportPending}
        disabled={isAnyImportRunning}
        onSubmit={onCategoriesImport}
      />

      <TaxonomyImportSection
        title="분류 한국어명 CSV import"
        description="category/mechanic 원문 분류명에 한국어 표시명을 일괄 반영합니다."
        columns="권장 컬럼: type, bggName, koName"
        note="기존 taxonomy만 업데이트하며, DB에 없는 분류명은 생성하지 않고 스킵합니다."
        fileName="taxonomyKoCsvFile"
        fileLabel="보드게임 분류 한국어명 CSV 파일"
        buttonLabel="분류명 반영"
        pendingLabel="반영 중"
        pending={isTaxonomyKoImportPending}
        disabled={isAnyImportRunning}
        onSubmit={onTaxonomyKoImport}
      />

      {importProgress ? (
        <ImportProgressPanel progress={importProgress} />
      ) : null}
    </section>
  );
}

/**
 * 메커니즘/카테고리/분류명용 taxonomy CSV import 섹션 구성
 *
 * @param props - 섹션 문구, 파일 필드, 처리 상태와 submit handler
 * @returns taxonomy import 섹션 UI
 */
function TaxonomyImportSection({
  title,
  description,
  columns,
  note,
  fileName,
  fileLabel,
  buttonLabel,
  pendingLabel,
  pending,
  disabled,
  onSubmit,
}: {
  title: string;
  description: string;
  columns: string;
  note: string;
  fileName: string;
  fileLabel: string;
  buttonLabel: string;
  pendingLabel: string;
  pending: boolean;
  disabled: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <div className="border-t border-border-subtle pt-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <p className="mt-1 text-sm text-muted">{description}</p>
          <p className="mt-1 text-xs font-medium text-muted">{columns}</p>
          <p className="mt-1 text-xs font-medium text-muted">{note}</p>
        </div>

        <CsvImportForm
          fileName={fileName}
          fileLabel={fileLabel}
          buttonLabel={buttonLabel}
          pendingLabel={pendingLabel}
          pending={pending}
          disabled={disabled}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

/**
 * CSV 파일 하나를 Server Action FormData로 전달하는 공통 form 구성
 *
 * @param props - 파일 input 이름/라벨, 버튼 문구, pending 상태와 submit handler
 * @returns CSV import form UI
 */
function CsvImportForm({
  fileName,
  fileLabel,
  buttonLabel,
  pendingLabel,
  pending,
  disabled,
  onSubmit,
}: {
  fileName: string;
  fileLabel: string;
  buttonLabel: string;
  pendingLabel: string;
  pending: boolean;
  disabled: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
      className="grid w-full gap-3 sm:w-auto sm:grid-cols-[360px_104px]"
    >
      <input
        name={fileName}
        type="file"
        accept=".csv,text/csv"
        className="input-primary min-h-11 w-full cursor-pointer px-3.5 py-2 text-sm"
        aria-label={fileLabel}
        required
      />
      <button
        type="submit"
        disabled={pending || disabled}
        className="btn-primary min-h-11 px-4 text-sm font-bold disabled:opacity-60"
      >
        {pending ? pendingLabel : buttonLabel}
      </button>
    </form>
  );
}
