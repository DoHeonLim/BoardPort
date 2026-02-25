/**
 * File Name : app/offline/page.tsx
 * Description : 오프라인 상태 안내 페이지(PWA fallback)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.29  임도헌   Created   오프라인 전용 안내 페이지 추가
 * 2025.11.29  임도헌   Modified  보트포트 컨셉에 맞는 UI 및 안내 텍스트 정리
 * 2026.01.14  임도헌   Modifeid  시멘틱 토큰 적용
 * 2026.02.02  임도헌   Modified  주석 상세 설명 보강
 * 2026.02.25  임도헌   Modified  로고 컴포넌트 적용 및 오프라인 테마 강화
 */
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { SignalSlashIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

/**
 * PWA 오프라인 폴백(Fallback) 페이지
 *
 * - 인터넷 연결이 끊겼을 때 Service Worker가 이 페이지를 서빙
 * - 사용자에게 오프라인 상태임을 알리고, 재시도(새로고침) 가이드를 제공
 * - `next-pwa` 설정(`fallbacks: { document: "/offline" }`)에 의해 매핑
 *
 * @returns {JSX.Element} 오프라인 안내 UI
 */
export default function OfflinePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 bg-background transition-colors text-center">
      {/* 로고 및 아이콘 영역 */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="relative p-5 rounded-full bg-surface-dim border border-border animate-float shadow-sm">
          {/* 심볼 로고를 반투명/그레이스케일로 처리하여 오프라인 느낌 강조 */}
          <Logo variant="symbol" size={80} className="grayscale opacity-40" />
          <div className="absolute -bottom-1 -right-1 bg-background p-1 rounded-full border border-border">
            <SignalSlashIcon className="size-6 text-danger" />
          </div>
        </div>
        <Logo variant="full" size={160} className="opacity-80" />
      </div>

      <h1 className="text-2xl font-bold text-primary mb-3">
        항로를 잃었습니다
      </h1>
      <p className="text-sm text-muted mb-8 leading-relaxed max-w-xs mx-auto">
        현재 인터넷에 연결되어 있지 않아
        <br />
        보드포트에 접속할 수 없습니다.
      </p>

      <div className="w-full max-w-sm rounded-2xl bg-surface border border-border p-5 text-left mb-8 shadow-sm">
        <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
          💡 연결 확인하기
        </h3>
        <ul className="space-y-2 text-xs text-muted list-disc list-inside">
          <li>Wi-Fi 또는 모바일 데이터 활성화 확인</li>
          <li>비행기 모드 종료 여부 확인</li>
          <li>인터넷 연결 후 아래 버튼 클릭</li>
        </ul>
      </div>

      <Link
        href="/"
        className={cn(
          "btn-primary h-12 px-10 text-base font-semibold shadow-lg",
          "flex items-center justify-center gap-2"
        )}
      >
        재시도
      </Link>
    </main>
  );
}
