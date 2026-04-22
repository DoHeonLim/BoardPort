/**
 * File Name : app/(app)/(tabs)/streams/loading.tsx
 * Description : 스트리밍 탭 로딩
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.21  임도헌   Created
 * 2025.05.21  임도헌   Modified  라이브 스트리밍 로딩 페이지 추가
 * 2026.01.14  임도헌   Modified  탭/검색창/리스트 스켈레톤 적용
 * 2026.03.06  임도헌   Modified  실제 스트림 헤더/카드 밀도와 동일한 스켈레톤 구조로 정리
 * 2026.03.11  임도헌   Modified  신규 2단 스트림 헤더 구조와 디자인 토큰(border-subtle)에 맞춘 스켈레톤으로 재정렬
 * 2026.03.12  임도헌   Modified  스트림 로딩 세그먼트 외곽선을 border-border-subtle 기준으로 통일
 * 2026.03.19  임도헌   Modified  현재 StreamMobileHeader의 낮아진 박스감에 맞춰 스코프/카테고리 스켈레톤 밀도를 한 단계 완화
 * 2026.03.28  임도헌   Modified  라이브/다시보기 최상단 모드 탭이 추가된 3단 헤더 구조에 맞춰 보정
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/streams/loading.tsx 에서 app/(app)/(tabs)/streams/loading.tsx 로 변경 (라우트 그룹 개편)
 */

import StreamsPageSkeleton from "@/features/stream/components/StreamsPageSkeleton";

export default function Loading() {
  return <StreamsPageSkeleton />;
}

