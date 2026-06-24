/**
 * File Name : app/(app)/posts/add/page.tsx
 * Description : 게시글 작성 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created   기존 add/page.tsx 흐름 유지하며 공통 폼 리팩토링
 * 2025.11.13  임도헌   Modified  h1 삭제
 * 2026.01.23  임도헌   Modified  submitPost Action을 연결
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.03.06  임도헌   Modified  페이지 배경을 시맨틱 배경 토큰(bg-background)으로 통일
 * 2026.04.12  임도헌   Moved     파일 경로를 app/posts/add/page.tsx 에서 app/(app)/posts/add/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.14  임도헌   Modified  PostForm이 mode 기반으로 내부 서버 액션을 선택하도록 정리해 action prop 전달 제거
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 옵션 주입
 * 2026.05.09  임도헌   Modified  작성 페이지 정적 프리렌더를 비활성화해 보드게임 옵션 DB 조회 안정화
 */

import PostForm from "@/features/post/components/PostForm";
import { getBoardGameRelationOptions } from "@/features/boardgame/service/publicQuery/relationOptions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 게시글 작성 페이지
 *
 * - `PostForm` 컴포넌트를 사용하여 게시글 작성 폼을 렌더링
 * - `PostForm`이 create 모드에서 내부 서버 액션을 선택하도록 연결
 */
export default async function AddPostPage() {
  const boardGameOptionsResult = await getBoardGameRelationOptions();

  return (
    <div className="min-h-screen bg-background">
      <PostForm
        mode="create"
        backUrl="/posts"
        boardGameOptions={
          boardGameOptionsResult.success ? boardGameOptionsResult.data : []
        }
        submitLabel="게시글 등록"
      />
    </div>
  );
}
