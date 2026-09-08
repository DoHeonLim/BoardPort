/**
 * File Name : features/post/components/PostEditBackButton.tsx
 * Description : 게시글 수정 화면의 진입 문맥 기반 뒤로가기 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   직접 진입과 상세 편집 흐름 모두에서 안전한 복귀 경로 계산
 */

"use client";

import { useSearchParams } from "next/navigation";
import BackButton from "@/components/global/BackButton";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/** 수정 URL의 returnTo와 flow를 보존한 상세 또는 목록 복귀 버튼을 구성한다. */
export default function PostEditBackButton({ postId }: { postId: number }) {
  const searchParams = useSearchParams();
  const safePostHref = postId > 0 ? `/posts/${postId}` : "/posts";
  const rawReturnTo = searchParams.get("returnTo");
  const safeReturnTo = sanitizeCallbackUrl(rawReturnTo ?? safePostHref);
  const fallbackHref =
    postId > 0 && searchParams.get("flow") === "detail-edit"
      ? `/posts/${postId}?returnTo=${encodeURIComponent(safeReturnTo)}`
      : safeReturnTo;

  return (
    <BackButton
      fallbackHref={fallbackHref}
      preferFallback
      variant="appbar"
      className="px-0"
    />
  );
}
