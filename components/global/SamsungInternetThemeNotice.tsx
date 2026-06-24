/**
 * File Name : components/global/SamsungInternetThemeNotice.tsx
 * Description : 삼성 인터넷 강제 다크모드 사용 시 테마 차이를 안내하는 배너
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.12  임도헌   Created   삼성 인터넷 브라우저의 스마트 다크모드 안내 배너 추가
 */
"use client";

import { useEffect, useState } from "react";

/**
 * 삼성 인터넷 다크모드 안내 배너
 */
export default function SamsungInternetThemeNotice() {
  const [isSamsungInternet, setIsSamsungInternet] = useState(false);

  useEffect(() => {
    setIsSamsungInternet(/SamsungBrowser\//i.test(window.navigator.userAgent));
  }, []);

  if (!isSamsungInternet) return null;

  return (
    <div className="mx-auto mt-3 w-full max-w-mobile rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
      삼성 인터넷의 페이지 다크모드가 켜져 있으면 앱 색상이 다르게 보일 수
      있습니다. 색상 이상이 보이면 브라우저의 스마트 다크모드 또는 페이지
      다크모드를 꺼주세요.
    </div>
  );
}
