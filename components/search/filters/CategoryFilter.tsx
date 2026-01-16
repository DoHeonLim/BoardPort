/**
 * File Name : components/search/filters/CategoryFilter
 * Description : 카테고리 필터 (대분류/소분류)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.18  임도헌   Created   카테고리 필터 분리 및 option 렌더링 최적화
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 */
"use client";

import type { Category } from "@/generated/prisma/client";
import Select from "@/components/ui/Select";

interface CategoryFilterProps {
  parentCategories: Category[];
  childCategories: Category[];
  selectedParentCategory: string;
  onParentChange: (value: string) => void;
  selectedChildCategory: string;
  onChildChange: (value: string) => void;
}

export default function CategoryFilter({
  parentCategories,
  childCategories,
  selectedParentCategory,
  onParentChange,
  selectedChildCategory,
  onChildChange,
}: CategoryFilterProps) {
  return (
    <div className="space-y-3">
      <Select
        label="대분류"
        value={selectedParentCategory}
        onChange={(e) => onParentChange(e.target.value)}
        className="text-sm h-10" // h-10 for filter inputs
      >
        <option value="">전체</option>
        {parentCategories.map((cat) => (
          <option key={cat.id} value={String(cat.id)}>
            {cat.icon} {cat.kor_name}
          </option>
        ))}
      </Select>

      {selectedParentCategory && (
        <Select
          label="소분류"
          value={selectedChildCategory}
          onChange={(e) => onChildChange(e.target.value)}
          className="text-sm h-10 animate-fade-in"
        >
          <option value={selectedParentCategory}>전체</option>
          {childCategories.map((child) => (
            <option key={child.id} value={String(child.id)}>
              {child.icon} {child.kor_name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
