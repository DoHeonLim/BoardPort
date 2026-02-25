/**
 * File Name : app/post/[id]/edit/page.tsx
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
 */
import { notFound, redirect } from "next/navigation";
import getSession from "@/lib/session";
import PostForm from "@/features/post/components/PostForm";
import { getCachedPost } from "@/features/post/service/post";
import { updatePostAction } from "@/features/post/actions/update";
import { deletePostAction } from "@/features/post/actions/delete";
import { LocationData } from "@/features/map/types";

/**
 * 게시글 수정 페이지
 *
 * [기능]
 * 1. 게시글 정보를 조회하고 작성자 본인인지 확인 (비권한 시 리스트로 이동)
 * 2. 기존 게시글 데이터를 폼 초기값으로 주입하여 `PostForm`을 렌더링
 * 3. 게시글 삭제 버튼(Server Action Form)을 별도로 제공
 *
 * @param {Object} params - URL 파라미터 (id: 게시글 ID)
 */
export default async function PostEditPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (isNaN(id)) return notFound();

  // 1. 게시글 조회
  const post = await getCachedPost(id);
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
