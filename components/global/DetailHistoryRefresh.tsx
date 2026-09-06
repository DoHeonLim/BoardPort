/**
 * File Name : components/global/DetailHistoryRefresh.tsx
 * Description : 방문 기록으로 복원한 콘텐츠 상세의 서버 상태 재검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.05  임도헌   Created   상품·게시글·다시보기 history 및 BFCache 복원 시 삭제 상태 재검증
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const DETAIL_PATH =
  /^(?:\/products\/view\/\d+|\/posts\/\d+|\/streams\/\d+\/recording)\/?$/;

/**
 * 삭제된 게시글이 앞으로가기에서 이전 본문으로 복원되는 DATA-06 결함 보완.
 * 다른 세션의 삭제는 현재 브라우저의 Router Cache나 편집 갱신 플래그에 반영되지 않음.
 * 상세가 마운트되기 전 popstate도 수신하도록 앱 레이아웃에서 구독 유지.
 * Next의 경로 복원이 끝난 뒤 refresh하여 기존 서버의 미존재·접근 권한 가드 재실행.
 * 삭제 여부를 브라우저에서 알 수 없으므로 정상 상세도 기록 복원 시 서버 재조회 대상.
 * 전체 문서 reload와 주기적 polling 없이 현재 상세의 서버 payload만 갱신.
 * 정상 Link 이동·초기 로딩·목록·편집 화면은 추가 갱신 대상에서 제외.
 */
export default function DetailHistoryRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<{
    href: string;
    pathname: string;
  } | null>(null);

  useEffect(() => {
    const schedule = () => {
      const { href, pathname: targetPath } = window.location;
      setPending(
        DETAIL_PATH.test(targetPath) ? { href, pathname: targetPath } : null
      );
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) schedule();
    };
    window.addEventListener("popstate", schedule);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (!pending || pending.pathname !== pathname) return;
    // 경로 복원 후 다음 작업으로 갱신 예약, 타이머 실행 전 연속 복원 이벤트 병합.
    const timer = window.setTimeout(() => {
      if (window.location.href === pending.href) router.refresh();
      setPending(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, pending, router]);

  return null;
}
