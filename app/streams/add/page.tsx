/**
 * File Name : app/streams/add/page.tsx
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
 * 2026.01.14  임도헌   Modified   시맨틱 토큰 및 레이아웃 적용
 * 2026.01.14  임도헌   Modified   헤더를 layout으로 위임하고 본문만 남김
 * 2026.01.29  임도헌   Modified   주석 설명 보강
 * 2026.03.06  임도헌   Modified   작성 페이지 정적 프리렌더를 비활성화해 인증 기반 폼 진입 흐름을 안정화
 * 2026.03.07  임도헌   Modified   StreamForm 취소 경로를 명시적으로 주입(v1.2 Cancelable Flow)
 */

import type { Metadata } from "next";
import StreamForm from "@/features/stream/components/StreamForm";
import { fetchStreamCategories } from "@/features/stream/service/category";
import { createBroadcastAction } from "@/features/stream/actions/create";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "새로운 스트리밍 시작하기 | BoardPort",
  description: "OBS/방송 툴과 호환되는 라이브 스트리밍을 생성하세요.",
};

/**
 * 방송 생성 페이지
 *
 * - 방송 카테고리를 미리 로드하여 폼에 주입
 * - `StreamForm` 컴포넌트를 렌더링
 */
export default async function AddStreamPage() {
  let categories: Awaited<ReturnType<typeof fetchStreamCategories>> = [];

  try {
    categories = await fetchStreamCategories();
  } catch (err) {
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
        cancelHref="/streams"
      />
    </div>
  );
}
