/**
 * File Name : features/post/components/postsDetail/index.tsx
 * Description : 게시글 상세 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   몰입형 Wave 디자인 적용
 * 2025.07.11  임도헌   Modified  게시글 상세 페이지 기능별로 컴포넌트 분리
 * 2025.11.13  임도헌   Modified  PostDetailTopbar 도입(뒤로가기+카테고리)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 배경색 및 패딩 조정
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.17  임도헌   Modified  PostDetailCarousel 컴포넌트 제거 후 Carousel 컴포넌트로 변경
 * 2026.01.22  임도헌   Modified  user 타입 정의 완화 (User -> UserLite)
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  UI 순서 재배치
 * 2026.03.08  임도헌   Modified  상세 본문 기본 진입 애니메이션을 제거해 읽기 흐름을 방해하지 않도록 정리
 * 2026.03.13  임도헌   Modified  상세 상단바의 뒤로가기와 수정 진입 경로에 returnTo를 연동
 * 2026.03.14  임도헌   Modified  공통 세션 refresh 플래그를 소비해 상세에서 진입한 수정 흐름의 저장 후 back 복귀를 1회 최신화로 안정화
 * 2026.03.14  임도헌   Modified  지도 섹션 제목의 이모지를 아이콘 기반으로 교체해 제품 상세와 톤을 통일
 * 2026.03.15  임도헌   Modified  댓글 섹션 제목의 시스템 이모지를 heroicons 기반 아이콘으로 교체
 * 2026.03.17  임도헌   Modified  작은 모바일 화면에서는 카테고리 칩을 본문 상단으로 이동해 헤더 과밀 완화
 * 2026.03.18  임도헌   Modified  비채팅 returnTo 문맥의 detail-edit는 replace 기반 진입으로 정리해 삭제 후 stale history를 방지
 * 2026.04.01  임도헌   Modified  게시글 detail-edit는 push 진입으로 되돌리고 저장/취소 복귀는 상세 재진입으로 분리
 * 2026.03.23  임도헌   Modified  본문 섹션 구분선과 이미지 카드 외곽선을 구조 구분선 성격에 맞춰 subtle 기준으로 정리
 * 2026.03.27  임도헌   Modified  상세 본문을 읽기 컬럼 폭으로 정리하고 태그/댓글 섹션 흐름을 재배치
 * 2026.03.30  임도헌   Modified  PostBlock 기반 본문/미디어 렌더링 구조 도입
 * 2026.03.31  임도헌   Modified  새 게시글 구조 기준으로 blocks 전용 렌더링으로 단순화
 * 2026.04.05  임도헌   Modified  게시글 detail-edit 저장 복귀는 back 기반으로 유지하고, 상세 재진입 시 1회 refresh와 상단 스크롤을 함께 적용
 * 2026.04.10  임도헌   Modified  post 타이포 정책에 맞춰 모바일 카테고리 칩 weight를 500 기준으로 정리
 * 2026.04.14  임도헌   Modified  상세 지도/복귀 부작용을 전용 컴포넌트로 분리해 초기 본문 비용과 scroll 복귀 안정성을 함께 개선
 * 2026.04.14  임도헌   Modified  main 랜드마크와 섹션 헤딩 레벨을 정리해 접근성과 문서 구조를 보강
 * 2026.04.24  임도헌   Modified  detail-edit 링크에도 항상 내부 returnTo를 실어 저장 back 안전 조건과 정합성을 맞춤
 * ===============================================================================================
 * PostDetail (게시글 상세) 페이지를 구성하는 UI 요소 모음
 *
 * - PostDetailTopbar.tsx : 상단바 (뒤로가기, 카테고리 칩, 관리/옵션 메뉴)
 * - PostDetailTitle.tsx  : 게시글 제목
 * - PostDetailBlocks.tsx : TEXT / IMAGE / VIDEO 블록 렌더링
 * - PostDetailMeta.tsx   : 작성일, 조회수, 좋아요 버튼 등 메타 정보
 * - index.tsx            : 위 컴포넌트들을 조합하고 댓글 섹션을 포함한 최종 컨테이너
 * ===============================================================================================
 */
"use client";

import { PostDetail as PostDetailType } from "@/features/post/types";
import PostDetailTitle from "@/features/post/components/postsDetail/PostDetailTitle";
import PostDetailBlocks from "@/features/post/components/postsDetail/PostDetailBlocks";
import PostDetailTags from "@/features/post/components/postsDetail/PostDetailTags";
import PostDetailMeta from "@/features/post/components/postsDetail/PostDetailMeta";
import PostDetailTopbar from "@/features/post/components/postsDetail/PostDetailTopbar";
import PostDetailClientEffects from "@/features/post/components/postsDetail/PostDetailClientEffects";
import PostDetailLocationSection from "@/features/post/components/postsDetail/PostDetailLocationSection";
import PostComment from "@/features/post/components/postComment";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import { POST_CATEGORY, type PostCategoryType } from "@/features/post/constants";

interface UserLite {
  id: number;
  username: string;
  avatar: string | null;
}

interface PostDetailProps {
  post: PostDetailType;
  user: UserLite;
  views: number;
  likeCount: number;
  isLiked: boolean;
  returnTo?: string;
  hasExplicitReturnTo?: boolean;
}

/**
 * 게시글 상세 페이지 컨테이너
 *
 * [구조]
 * 1. 상단바
 * 2. 제목
 * 3. PostBlock 기반 본문/미디어
 * 4. 태그 / 장소 / 메타
 * 5. 댓글 섹션
 *
 */
export default function PostDetail({
  post,
  user,
  views,
  likeCount,
  isLiked,
  returnTo,
  hasExplicitReturnTo = false,
}: PostDetailProps) {
  const canEdit = post.user.id === user.id;
  const categoryLabel =
    post.category && POST_CATEGORY[post.category as PostCategoryType];
  // detail-edit는 항상 내부 상세 경로를 returnTo로 포함해 저장 시 안전한 back 기준 정렬
  const detailReturnTo = returnTo ?? `/posts/${post.id}`;
  const editHref = `/posts/${post.id}/edit?returnTo=${encodeURIComponent(
    detailReturnTo
  )}&flow=detail-edit`;

  return (
    <div className="relative min-h-screen bg-background transition-colors pb-20">
      <PostDetailClientEffects postId={post.id} />

      {/* 1. 상단바 */}
      <PostDetailTopbar
        postId={post.id}
        title={post.title}
        authorId={post.user.id}
        authorUsername={post.user.username}
        authorAvatar={post.user.avatar}
        category={post.category}
        backHref={returnTo}
        canEdit={canEdit}
        editHref={editHref}
        preferHistoryBack={hasExplicitReturnTo}
      />

      <main className="mx-auto flex w-full max-w-mobile flex-col gap-8 px-page-x py-6">
        {/* 작은 모바일 화면에서는 카테고리 칩을 본문으로 내려 작성자 영역 과밀 완화 */}
        {categoryLabel && (
          <div className="sm:hidden -mb-4">
            <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand dark:bg-brand-light/20 dark:text-gray-100">
              {categoryLabel}
            </span>
          </div>
        )}

        {/* 2. 제목 */}
        <PostDetailTitle title={post.title} />

        {/* 3. 본문/미디어 영역 */}
        <PostDetailBlocks blocks={post.blocks ?? []} />

        {/* 4. 태그 */}
        <PostDetailTags tags={post.tags} />

        {/* 5. 지도 (장소) */}
        <PostDetailLocationSection
          latitude={post.latitude ?? null}
          longitude={post.longitude ?? null}
          locationName={post.locationName ?? null}
          region1={post.region1 ?? null}
          region2={post.region2 ?? null}
          region3={post.region3 ?? null}
        />

        {/* 6. 메타 정보 (하단 반응 섹션) */}
        <div className="border-t border-border-subtle pt-4">
          <PostDetailMeta
            postId={post.id}
            isLiked={isLiked}
            likeCount={likeCount}
            views={views}
            createdAt={post.created_at?.toString() ?? ""}
          />
        </div>

        {/* 7. 댓글 섹션 */}
        <section className="border-t border-border-subtle pt-6">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <ChatBubbleLeftEllipsisIcon className="size-5 text-brand" />
            항해 로그
          </h2>
          <PostComment postId={post.id} user={user} />
        </section>
      </main>
    </div>
  );
}
