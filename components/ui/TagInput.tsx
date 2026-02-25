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
 */
"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { Control, useController } from "react-hook-form";
import { cn } from "@/lib/utils";

interface TagInputProps {
  name: string;
  control: Control<any>;
  maxTags?: number;
  resetSignal?: number;
}

export default function TagInput({
  name,
  control,
  maxTags = 5,
  resetSignal,
}: TagInputProps) {
  const {
    field: { value: tags = [], onChange },
    fieldState: { error },
  } = useController({ name, control });

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setTagInput("");
  }, [resetSignal]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
                className="hover:text-primary transition-colors"
                aria-label={`${tag} 태그 삭제`}
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
        disabled={tags.length >= maxTags}
        className={cn(
          "input-primary h-input-md px-4", // 시맨틱 높이 및 클래스
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      />
      {error && <p className="text-xs text-danger mt-1">{error.message}</p>}
    </div>
  );
}
