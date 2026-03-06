/**
 * File Name : app/posts/[id]/edit/page.tsx
 * Description : 게시글 수정 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.04.21  임도헌   Created
 * 2025.04.21  임도헌   Modified  게시글 수정 페이지 추가
 * 2025.07.04  임도헌   Modified  게시글 등록, 편집 컴포넌트로 통합
 * 2025.11.13  임도헌   Modified  뒤로가기 버튼 layout으로 이동
 * 2025.11.20  임도헌   Modified  삭제 흐름 정리
 * 2026.01.19  임도헌   Modified  getIsOwner 제거 및 직접 비교
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
import { notFound, redirect } from "next/navigation";
import getSession from "@/lib/session";
import PostForm from "@/features/post/components/PostForm";
import { getPostDetail } from "@/features/post/service/post";
import { updatePostAction } from "@/features/post/actions/update";
import { deletePostAction } from "@/features/post/actions/delete";
import { LocationData } from "@/features/map/types";

/**
 * 게시글 수정 페이지
 *
 * [기능]
 * - URL 파라미터 기반 게시글 상세 정보 서버 사이드 로드 적용
 * - 게시글 작성자와 현재 로그인 세션 정보 비교를 통한 소유권 검증
 * - 비인가 사용자(소유자가 아닌 경우)의 비정상적 접근 시 게시글 목록 페이지로 리다이렉트 처리
 * - 기존 게시글 데이터를 폼 컴포넌트의 초기값으로 주입 처리
 */
export default async function PostEditPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (isNaN(id)) return notFound();

  // 1. 게시글 조회
  const post = await getPostDetail(id);
  if (!post) return notFound();

  // 2. 권한 확인
  const session = await getSession();
  const isOwner = session?.id === post.user.id;
  if (!isOwner) redirect("/posts");

  // 3. 삭제 핸들러 (Server Action Wrapper)
  const handleDeletePost = async () => {
    "use server";
    await deletePostAction(id);
    redirect("/posts"); // 삭제 후 목록으로 이동
  };

  let initialLocation: LocationData | null = null;

  if (post.latitude && post.longitude && post.locationName) {
    initialLocation = {
      latitude: post.latitude,
      longitude: post.longitude,
      locationName: post.locationName,
      region1: post.region1 ?? "",
      region2: post.region2 ?? "",
      region3: post.region3 ?? "",
    };
  }

  return (
    <div className="min-h-screen dark:bg-neutral-900 bg-white">
      <PostForm
        initialValues={{
          id: post.id,
          title: post.title,
          description: post.description ?? "",
          category: post.category,
          tags: post.tags.map((tag) => tag.name),
          photos: post.images.map((image) => image.url),
          location: initialLocation,
        }}
        action={updatePostAction}
        backUrl={`/posts/${post.id}`}
        submitLabel="수정 완료"
        isEdit
      />
      <form
        action={handleDeletePost}
        className="flex items-center justify-center"
      >
        <button className="bg-rose-700 hover:bg-rose-500 w-full mx-5 py-2 rounded-md text-white font-semibold sm:text-sm md:text-md transition-colors">
          삭제하기
        </button>
      </form>
    </div>
  );
}
