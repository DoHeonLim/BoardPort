/**
 * File Name : app/(tabs)/posts/page.tsx
 * Description : 항해일지 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  동네생활 페이지 추가
 * 2024.11.23  임도헌   Modified  게시글을 최신 게시글순으로 출력되게 수정
 * 2024.11.23  임도헌   Modified  게시글 생성 링크 추가
 * 2024.12.12  임도헌   Modified  게시글 좋아요 명 변경
 * 2024.12.12  임도헌   Modified  게시글 생성 시간 표시 변경
 * 2024.12.18  임도헌   Modified  항해일지 페이지로 변경(동네생활 -> 항해일지)
 * 2024.12.23  임도헌   Modified  게시글 페이지 다크모드 추가
 * 2025.05.06  임도헌   Modified  그리드/리스트 뷰 모드 추가
 * 2025.05.06  임도헌   Modified  게시글 페이지 컴포넌트 수정
 * 2025.06.26  임도헌   Modified  PostList, PostCard 분리 및 검색 구조 개선
 * 2025.11.20  임도헌   Modified  게시글 페이지 동적으로 변경
 * 2026.01.03  임도헌   Modified  force-dynamic 제거(명시적 강제 제거), 캐시(nextCache + POST_LIST 태그)로 전환
 * 2026.01.13  임도헌   Modified  [UI] Sticky Header 디자인 통일 및 시맨틱 토큰 적용
 * 2026.01.22  임도헌   Modified  Service 직접 호출로 최적화 (Action 의존 제거)
 * 2026.01.27  임도헌   Modified  주석 보강
 */
import PostList from "@/features/post/components/PostList";
import PostEmptyState from "@/features/post/components/PostEmptyState";
import AddPostButton from "@/features/post/components/AddPostButton";
import PostSearchBarWrapper from "@/features/post/components/PostSearchBarWrapper";
import PostCategoryTabs from "@/features/search/components/PostCategoryTabs";
import { getCachedInitialPosts } from "@/features/post/service/post";

interface PostsPageProps {
  searchParams: {
    keyword?: string;
    category?: string;
  };
}

/**
 * 게시글 목록 페이지
 *
 * [기능]
 * 1. 카테고리 탭(`PostCategoryTabs`)과 검색바(`PostSearchBarWrapper`)를 제공합니다.
 * 2. `getCachedInitialPosts` Service를 호출하여 초기 게시글 목록을 로드합니다.
 * 3. 게시글이 있으면 `PostList`, 없으면 `PostEmptyState`를 렌더링합니다.
 * 4. 우측 하단에 글쓰기 버튼(`AddPostButton`)을 표시합니다.
 *
 * @param {PostsPageProps} props - URL 쿼리 파라미터 (keyword, category)
 */
export default async function PostsPage({ searchParams }: PostsPageProps) {
  // Service 직접 호출 (캐싱된 초기 데이터)
  const initialData = await getCachedInitialPosts({
    keyword: searchParams.keyword,
    category: searchParams.category,
  });

  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm transition-colors">
        <div className="flex flex-col gap-3 px-4 py-3">
          <PostCategoryTabs currentCategory={searchParams.category} />
          <PostSearchBarWrapper />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-page-x py-6">
        {initialData.posts.length === 0 ? (
          <PostEmptyState
            keyword={searchParams.keyword}
            category={searchParams.category}
          />
        ) : (
          <PostList
            // 검색 조건 변경 시 스크롤/상태 초기화를 위해 key 부여
            key={JSON.stringify(searchParams)}
            initialPosts={initialData.posts}
            nextCursor={initialData.nextCursor}
          />
        )}
      </div>

      {/* Add Button */}
      <AddPostButton />
    </div>
  );
}
