/**
 * File Name : features/product/components/ProductCategorySection.tsx
 * Description : 제품 폼 카테고리/게임 종류 선택 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   ProductForm의 카테고리/게임 종류 선택 UI를 별도 섹션으로 분리
 */

import Select from "@/components/ui/Select";
import { GAME_TYPES, GAME_TYPE_DISPLAY } from "@/features/product/constants";
import type { Category } from "@/generated/prisma/client";

interface ProductCategorySectionProps {
  selectedMainCategory: number | null;
  onMainCategoryChange: (value: string) => void;
  mainCategories: Category[];
  mainCategoryErrors: string[];
  subDisabled: boolean;
  isOtherMainCategory: boolean;
  subCategories: Category[];
  subCategoryRegister: Record<string, unknown>;
  subCategoryErrors: string[];
  gameTypeRegister: Record<string, unknown>;
  gameTypeErrorMessage?: string;
}

/**
 * 카테고리/게임 종류 선택 섹션
 *
 * [역할]
 * - 대분류/소분류 의존 관계와 게임 종류 선택 UI를 한 블록으로 묶어 ProductForm의 본문 길이를 줄인다
 * - 기타(OTHER) 대분류처럼 소분류가 필요 없는 예외도 이 섹션에서 함께 설명
 */
export default function ProductCategorySection({
  selectedMainCategory,
  onMainCategoryChange,
  mainCategories,
  mainCategoryErrors,
  subDisabled,
  isOtherMainCategory,
  subCategories,
  subCategoryRegister,
  subCategoryErrors,
  gameTypeRegister,
  gameTypeErrorMessage,
}: ProductCategorySectionProps) {
  return (
    <div className="grid grid-cols-1 gap-form-gap md:grid-cols-3">
      <Select
        label="대분류"
        value={selectedMainCategory?.toString() || ""}
        onChange={(event) => onMainCategoryChange(event.target.value)}
        errors={mainCategoryErrors}
      >
        <option value="">대분류 선택</option>
        {mainCategories.map((category) => (
          <option key={category.id} value={String(category.id)}>
            {category.kor_name}
          </option>
        ))}
      </Select>

      <div
        className={
          subDisabled ? "pointer-events-none select-none opacity-60" : ""
        }
        aria-disabled={subDisabled}
      >
        <Select
          label="소분류"
          {...subCategoryRegister}
          disabled={subDisabled}
          errors={subCategoryErrors}
        >
          <option value="">
            {isOtherMainCategory
              ? "기타는 소분류 선택이 필요하지 않습니다"
              : "소분류 선택"}
          </option>
          {subCategories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.kor_name}
            </option>
          ))}
        </Select>
      </div>

      <Select
        label="게임 종류"
        {...gameTypeRegister}
        errors={[gameTypeErrorMessage ?? ""]}
      >
        <option value="">게임 종류 선택</option>
        {GAME_TYPES.map((type) => (
          <option key={type} value={type}>
            {GAME_TYPE_DISPLAY[type]}
          </option>
        ))}
      </Select>
    </div>
  );
}
