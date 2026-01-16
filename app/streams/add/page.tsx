/**
 * File Name : app/streams/add/page
 * Description : 라이브 스트리밍 시작 페이지 (StreamForm 진입)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.11.12  임도헌   Created    최초 생성
 * 2024.11.12  임도헌   Modified   라이브 스트리밍 시작 페이지 추가
 * 2025.04.18  임도헌   Modified   스트리밍 생성 기능 추가
 * 2025.04.18  임도헌   Modified   스트리밍 생성 UI 개선
 * 2025.04.19  임도헌   Modified   OBS Studio 호환 방식으로 변경
 * 2025.07.30  임도헌   Modified   StreamForm 컴포넌트로 분리
 * 2025.09.09  임도헌   Modified   filename 정정, metadata/캐싱/a11y/에러 처리 보강
 * 2026.01.14  임도헌   Modified   [Rule 5.1] 시맨틱 토큰 및 레이아웃 적용
 * 2026.01.14  임도헌   Modified  [Refactor] 헤더를 layout으로 위임하고 본문만 남김
 */

import type { Metadata } from "next";
import StreamForm from "@/components/stream/StreamForm";
import { fetchStreamCategories } from "@/lib/category/fetchStreamCategories";
import { createBroadcastAction } from "./actions";

/**
 * SEO metadata
 * - 페이지 타이틀/설명 기본 제공. 필요시 채널/유저명 등으로 동적 확장 가능.
 */
export const metadata: Metadata = {
  title: "새로운 스트리밍 시작하기 | BoardPort",
  description: "OBS/방송 툴과 호환되는 라이브 스트리밍을 생성하세요.",
};

/**
 * 캐싱 정책
 * - 카테고리는 빈도가 낮게 변경되므로 1시간 캐싱. (운영 정책에 따라 0/force-dynamic로 조정 가능)
 */
export const revalidate = 3600;

export default async function AddStreamPage() {
  let categories: Awaited<ReturnType<typeof fetchStreamCategories>> = [];

  try {
    categories = await fetchStreamCategories();
  } catch (err) {
    // NOTE: 서버 로그 남기고 폼은 동작하도록 fallback
    console.error("[AddStreamPage] fetchStreamCategories failed:", err);
  }

  return (
    <div className="px-page-x py-6">
      <div className="mb-6">
        <p className="text-sm text-muted">
          제목, 카테고리, 썸네일을 설정하여 방송을 시작하세요.
          <br />
          생성 후 OBS 설정 정보를 확인할 수 있습니다.
        </p>
      </div>

      <StreamForm
        mode="create"
        action={createBroadcastAction}
        categories={categories ?? []}
      />
    </div>
  );
}
