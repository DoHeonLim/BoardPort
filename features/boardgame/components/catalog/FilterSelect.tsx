/**
 * File Name : features/boardgame/components/catalog/FilterSelect.tsx
 * Description : 보드게임 카탈로그 필터 select 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   목록 페이지의 반복 필터 select UI 분리
 */

interface FilterSelectProps {
  name: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * 카탈로그 URL query와 연결되는 uncontrolled select 필터를 표시
 *
 * @param props - 필터 이름, 라벨, 현재 값, 옵션 목록
 * @returns 보드게임 카탈로그 필터 select
 */
export default function FilterSelect({
  name,
  label,
  value,
  options,
}: FilterSelectProps) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-muted">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="input-primary h-11 bg-surface px-3 text-sm font-bold text-primary"
      >
        {options.map((option) => (
          <option key={`${name}-${option.value || "all"}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
