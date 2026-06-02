/**
 * File Name : features/post/components/PostMetaSection.tsx
 * Description : 게시글 폼 메타 정보 섹션 (카테고리 + 제목)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   PostForm의 카테고리/제목 입력 UI를 별도 섹션으로 분리
 * 2026.05.04  임도헌   Modified  카테고리와 제목 사이에 주제 메타 필드를 배치할 수 있도록 children 슬롯 추가
 * 2026.05.30  임도헌   Modified  작성형 폼 compact 밀도 기준 적용
 */

import type { ReactNode } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  POST_CATEGORY,
  POST_CATEGORY_FORM_LABEL,
} from "@/features/post/constants";

interface PostMetaSectionProps {
  isUploading: boolean;
  categoryRegister: Record<string, unknown>;
  categoryErrorMessage?: string;
  titleRegister: Record<string, unknown>;
  titleErrorMessage?: string;
  children?: ReactNode;
}

/**
 * 게시글 메타 정보 섹션
 *
 * [역할]
 * - 카테고리와 제목처럼 작성 초기에 반드시 입력하는 메타 필드를 한 묶음으로 제공
 * - `PostForm` 본문에서는 블록 에디터와 미디어 흐름에 더 집중할 수 있도록 상단 입력 영역을 분리
 */
export default function PostMetaSection({
  isUploading,
  categoryRegister,
  categoryErrorMessage,
  titleRegister,
  titleErrorMessage,
  children,
}: PostMetaSectionProps) {
  return (
    <>
      <Select
        label="카테고리"
        density="compact"
        disabled={isUploading}
        {...categoryRegister}
        errors={categoryErrorMessage ? [categoryErrorMessage] : []}
      >
        <option value="">카테고리 선택</option>
        {Object.entries(POST_CATEGORY).map(([key, value]) => (
          <option key={key} value={key}>
            {POST_CATEGORY_FORM_LABEL[
              key as keyof typeof POST_CATEGORY_FORM_LABEL
            ] ?? value}
          </option>
        ))}
      </Select>

      {children}

      <Input
        label="제목"
        type="text"
        density="compact"
        placeholder="제목을 입력해주세요"
        disabled={isUploading}
        {...titleRegister}
        errors={[titleErrorMessage ?? ""]}
      />
    </>
  );
}
