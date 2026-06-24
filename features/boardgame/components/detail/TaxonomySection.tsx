/**
 * File Name : features/boardgame/components/detail/TaxonomySection.tsx
 * Description : 보드게임 상세 taxonomy 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   상세 페이지 카테고리/메커니즘 섹션 UI 분리
 */

import Link from "next/link";
import { getTaxonomyLabel } from "@/features/boardgame/utils/format";

interface TaxonomySectionProps {
  title: string;
  items: Array<{ id: number; bggName: string; koName: string | null }>;
}

/**
 * category/mechanic taxonomy를 검색 링크 형태의 칩으로 표시하는 섹션 컴포넌트
 *
 * @param props - 섹션 제목과 taxonomy 목록
 * @returns taxonomy가 있을 때만 표시되는 섹션
 */
export default function TaxonomySection({
  title,
  items,
}: TaxonomySectionProps) {
  if (!items.length) return null;

  const isCategory = title === "카테고리";

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm">
      <h2 className="text-base font-bold text-primary">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const label = getTaxonomyLabel(item);

          return (
            <Link
              key={item.id}
              href={`/boardgames?q=${encodeURIComponent(label)}`}
              className={`focus-ring-soft rounded-full border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 ${
                isCategory
                  ? "border-brand/25 bg-brand/10 text-brand hover:bg-brand/15 dark:border-brand-light/40 dark:bg-brand-light/15 dark:text-brand-light dark:hover:bg-brand-light/20"
                  : "border-border-subtle bg-surface-dim text-muted hover:border-border hover:text-primary dark:border-border dark:text-primary dark:hover:bg-surface"
              }`}
              aria-label={`${label} 검색 결과 보기`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
