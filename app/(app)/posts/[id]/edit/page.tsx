/**
 * File Name : app/(app)/posts/[id]/edit/page.tsx
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
 * 2026.03.12  임도헌   Modified  게시글 수정 초기값에 이미지 애니메이션 메타를 함께 주입
 * 2026.03.13  임도헌   Modified  수정 화면 삭제 완료 후 기존 backUrl 경로로 복귀하도록 정리
 * 2026.03.13  임도헌   Modified  returnTo 복귀 경로를 수정 화면의 저장/삭제 흐름에 반영
 * 2026.03.14  임도헌   Modified  상세에서 진입한 수정 흐름을 flow=detail-edit로 받아 저장 후 back 복귀 기준을 명시
 * 2026.03.18  임도헌   Modified  detail-edit 삭제 복귀를 정규화된 returnTo 기준으로 판단하고, back 복귀 + 목록 refresh 플래그로 stale list와 raw 쿼리 예외를 함께 정리
 * 2026.04.01  임도헌   Modified  게시글 detail-edit 삭제는 history back 대신 명시 경로 복귀로 정리해 상세/목록 히스토리 문맥을 분리
 * 2026.03.23  임도헌   Modified  게시글 수정 페이지 id 가드를 상세 본문과 같은 유효 숫자/양수 기준으로 통일
 * 2026.04.06  임도헌   Modified  게시글 삭제를 상세 owner 메뉴로 이동해 수정 페이지는 편집 전용으로 단순화
 * 2026.04.12  임도헌   Moved     파일 경로를 app/posts/[id]/edit/page.tsx 에서 app/(app)/posts/[id]/edit/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.14  임도헌   Modified  PostForm이 mode 기반으로 내부 서버 액션을 선택하도록 정리해 action prop 전달 제거
*/
import { notFound, redirect } from "next/navigation";
import getSession from "@/lib/session";
import PostForm from "@/features/post/components/PostForm";
import { getPostDetail } from "@/features/post/service/post";
import { LocationData } from "@/features/map/types";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 게시글 수정 페이지
 *
 * [기능]
 * - URL 파라미터 기반 게시글 상세 정보 서버 사이드 로드 적용
 * - 게시글 작성자와 현재 로그인 세션 정보 비교를 통한 소유권 검증
 * - 비인가 사용자(소유자가 아닌 경우)의 비정상적 접근 시 게시글 목록 페이지로 리다이렉트 처리
 * - 기존 게시글 데이터를 폼 컴포넌트의 초기값으로 주입 처리
 * - returnTo 쿼리를 정규화해 저장/취소 후 복귀 경로로 사용
 *
 * @param {Object} props - 동적 라우트 파라미터와 쿼리 파라미터
 * @param {{ id: string }} props.params - 게시글 ID
 * @param {{ returnTo?: string; flow?: string }} [props.searchParams] - 수정 완료 후 복귀 경로 및 진입 흐름
 */
export default async function PostEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { returnTo?: string; flow?: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return notFound();
  const rawReturnTo = searchParams?.returnTo;
  const isDetailEditFlow = searchParams?.flow === "detail-edit";
  const safeReturnTo = sanitizeCallbackUrl(rawReturnTo ?? `/posts/${id}`);
  const detailHref = rawReturnTo
    ? `/posts/${id}?returnTo=${encodeURIComponent(safeReturnTo)}`
    : `/posts/${id}`;

  // 1. 게시글 조회
  const post = await getPostDetail(id);
  if (!post) return notFound();

  // 2. 권한 확인
  const session = await getSession();
  const isOwner = session?.id === post.user.id;
  if (!isOwner) redirect("/posts");

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
    <div className="min-h-screen bg-background">
      <PostForm
        mode="edit"
        initialValues={{
          id: post.id,
          title: post.title,
          description: post.description ?? "",
          category: post.category,
          tags: post.tags.map((tag) => tag.name),
          photos: post.images.map((image) => image.url),
          photosAnimated: post.images.map((image) => image.isAnimated ?? false),
          videoDraftKey: null,
          hasAttachedVideo: !!post.video,
          removeVideo: false,
          location: initialLocation,
        }}
        backUrl={isDetailEditFlow ? detailHref : safeReturnTo}
        submitLabel="수정 완료"
        initialVideo={post.video ?? null}
        initialBlocks={post.blocks ?? []}
        editFlow={searchParams?.flow}
      />
    </div>
  );
}

