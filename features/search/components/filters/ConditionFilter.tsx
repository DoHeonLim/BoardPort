/**
 * File Name : features/search/components/filters/ConditionFilter.tsx
 * Description : 제품 상태(새상품/중고 등) 필터 Select
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.18  임도헌   Created   제품 상태 필터 분리
 * 2026.01.11  임도헌   Modified  상수 import
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.04.10  임도헌   Modified  상위 검색 모달 클라이언트 경계 아래에서만 사용되도록 use client 중복 선언을 제거
 */

import Select from "@/components/ui/Select";
import {
  CONDITION_TYPES,
  CONDITION_DISPLAY,
} from "@/features/product/constants";

interface ConditionFilterProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * 상품 상태 조건을 선택하는 필터 셀렉트
 * - 전체/새상품/중고 상태 옵션을 공용 상수 기준으로 렌더링
 */
export default function ConditionFilter({
  value,
  onChange,
}: ConditionFilterProps) {
  return (
    <Select
      label="제품 상태"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm h-10"
    >
      <option value="">전체</option>
      {CONDITION_TYPES.map((type) => (
        <option key={type} value={type}>
          {CONDITION_DISPLAY[type]}
        </option>
      ))}
    </Select>
  );
}
