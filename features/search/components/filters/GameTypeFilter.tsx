/**
 * File Name : features/search/components/filters/GameTypeFilter.tsx
 * Description : 게임 타입 필터
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.18  임도헌   Created   게임 타입 필터 분리
 * 2026.01.11  임도헌   Modified  상수 import
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 */
"use client";

import Select from "@/components/ui/Select";
import { GAME_TYPES, GAME_TYPE_DISPLAY } from "@/lib/constants";

interface GameTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function GameTypeFilter({
  value,
  onChange,
}: GameTypeFilterProps) {
  return (
    <Select
      label="게임 타입"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm h-10"
    >
      <option value="">전체</option>
      {GAME_TYPES.map((type) => (
        <option key={type} value={type}>
          {GAME_TYPE_DISPLAY[type]}
        </option>
      ))}
    </Select>
  );
}
