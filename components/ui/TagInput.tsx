/**
 * File Name : components/ui/TagInput.tsx
 * Description : 태그 입력 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.18  임도헌   Created
 * 2024.12.31  임도헌   Modified  태그 입력 컴포넌트 수정
 * 2025.01.02  임도헌   Modified  defaultTags 예외처리 추가
 * 2025.04.21  임도헌   Modified  useController 사용하는 방식으로 변경
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 뱃지 색상 적용
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.04.04  임도헌   Modified  export 주석을 보강해 react-hook-form 기반 태그 입력 역할을 더 명확히 정리
 * 2026.05.17  임도헌   Modified  control/name props를 react-hook-form 제네릭 타입으로 구체화
 */
"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useController } from "react-hook-form";
import { cn } from "@/lib/utils";

interface TagInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  maxTags?: number;
  resetSignal?: number;
  disabled?: boolean;
}

/**
 * react-hook-form 필드와 연결된 공용 태그 입력 컴포넌트
 *
 * - Enter/쉼표 기반 태그 추가
 * - 최대 개수 제한 처리
 * - reset 신호와 disabled 상태 반영
 *
 * @param {TagInputProps} props - 필드 이름, control, 최대 개수, reset 신호 설정
 * @returns {JSX.Element} 태그 입력 필드와 태그 목록
 */
export default function TagInput<TFieldValues extends FieldValues>({
  name,
  control,
  maxTags = 5,
  resetSignal,
  disabled = false,
}: TagInputProps<TFieldValues>) {
  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController({ name, control });
  const tags = Array.isArray(value)
    ? (value as unknown[]).filter(
        (tag): tag is string => typeof tag === "string"
      )
    : [];

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setTagInput("");
  }, [resetSignal]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag) && tags.length < maxTags) {
        onChange([...tags, newTag]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (disabled) return;
    const newTags = tags.filter((tag: string) => tag !== tagToRemove);
    onChange(newTags);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-primary">
        태그 (최대 {maxTags}개)
      </label>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {tags.map((tag: string, index: number) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-badge text-badge-text border border-transparent dark:border-white/10"
            >
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="focus-ring-soft rounded-full hover:text-danger dark:hover:text-rose-400 transition-colors"
                aria-label={`${tag} 태그 삭제`}
                disabled={disabled}
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleAddTag}
        placeholder={
          tags.length >= maxTags ? "태그가 꽉 찼습니다" : "태그 입력 (Enter)"
        }
        disabled={disabled || tags.length >= maxTags}
        className={cn(
          "input-primary h-input-md px-4", // 시맨틱 높이 및 클래스
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      />
      {error && <p className="text-xs text-danger mt-1">{error.message}</p>}
    </div>
  );
}
