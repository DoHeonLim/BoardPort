/**
 * File Name : components/search/filters/ConditionFilter
 * Description : 제품 상태 필터
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.18  임도헌   Created   제품 상태 필터 분리
 * 2026.01.11  임도헌   Modified  상수 import
 */
"use client";

import Select from "@/components/ui/Select";
import { CONDITION_TYPES, CONDITION_DISPLAY } from "@/lib/constants";

interface ConditionFilterProps {
  value: string;
  onChange: (value: string) => void;
}

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
