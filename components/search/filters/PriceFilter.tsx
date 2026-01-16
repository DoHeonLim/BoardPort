/**
 * File Name : components/search/filters/PriceFilter
 * Description : 검색 필터 - 가격 범위 필터 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.18  임도헌   Created   가격 범위 필터 분리
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용, 화살표 버튼 숨기기, 키보드 위/아래 입력 차단
 */
"use client";

interface PriceFilterProps {
  minPrice: string;
  maxPrice: string;
  onChangeKeyValue: (key: "minPrice" | "maxPrice", value: string) => void;
}

export default function PriceFilter({
  minPrice,
  maxPrice,
  onChangeKeyValue,
}: PriceFilterProps) {
  // 키보드 화살표 위/아래 입력 차단 함수
  const preventArrowKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }
  };

  // 스피너(화살표) 숨김용 CSS 클래스 (Tailwind layer 또는 인라인 활용 가능하지만 여기선 유틸리티로 처리)
  // tailwind.config나 globals.css에 추가하지 않고 인라인 스타일로 해결하는 것이 컴포넌트 독립성에 유리함
  const noSpinnerStyle = {
    MozAppearance: "textfield", // Firefox
  } as React.CSSProperties;

  return (
    <div className="space-y-1.5">
      <style jsx>{`
        /* Webkit browsers (Chrome, Safari) */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>

      <label className="text-sm font-medium text-primary">가격 범위</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => onChangeKeyValue("minPrice", e.target.value)}
            onKeyDown={preventArrowKeys} // 키보드 방지
            placeholder="최소"
            className="input-primary h-10 px-3 text-sm"
            style={noSpinnerStyle} // Firefox 스피너 제거
            min="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">
            원
          </span>
        </div>
        <span className="text-muted text-sm">~</span>
        <div className="relative flex-1">
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => onChangeKeyValue("maxPrice", e.target.value)}
            onKeyDown={preventArrowKeys} // 키보드 방지
            placeholder="최대"
            className="input-primary h-10 px-3 text-sm"
            style={noSpinnerStyle} // Firefox 스피너 제거
            min="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">
            원
          </span>
        </div>
      </div>
    </div>
  );
}
