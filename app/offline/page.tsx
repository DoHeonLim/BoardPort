/**
 * File Name : app/offline/page
 * Description : 오프라인 상태 안내 페이지(PWA fallback)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.29  임도헌   Created   오프라인 전용 안내 페이지 추가
 * 2025.11.29  임도헌   Modified  보트포트 컨셉에 맞는 UI 및 안내 텍스트 정리
 * 2026.01.14  임도헌   Modifeid  [Rule 5.1] 시멘틱 토큰 적용용
 */
import Link from "next/link";
import { SignalSlashIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 bg-background transition-colors text-center">
      {/* Icon Area (Floating Effect) */}
      <div className="mb-6 p-5 rounded-full bg-surface-dim border border-border animate-float shadow-sm">
        <SignalSlashIcon className="size-12 text-muted" />
      </div>

      {/* Title & Description */}
      <h1 className="text-2xl font-bold text-primary mb-3">
        항로를 잃었습니다
      </h1>
      <p className="text-sm text-muted mb-8 leading-relaxed max-w-xs mx-auto">
        인터넷 연결이 끊어져 보드포트에 접속할 수 없습니다.
        <br />
        네트워크 상태를 확인하고 다시 시도해주세요.
      </p>

      {/* Guide Box */}
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-border p-5 text-left mb-8 shadow-sm">
        <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
          💡 이렇게 해보세요
        </h3>
        <ul className="space-y-2 text-xs text-muted list-disc list-inside marker:text-brand/50">
          <li>Wi-Fi 또는 모바일 데이터 연결 확인</li>
          <li>비행기 모드 켜짐 여부 확인</li>
          <li>잠시 후 페이지 새로고침</li>
        </ul>
      </div>

      {/* Action Button */}
      <Link
        href="/"
        className={cn(
          "btn-primary h-12 px-8 text-base font-semibold shadow-lg",
          "flex items-center justify-center gap-2"
        )}
      >
        <span>다시 시도하기</span>
      </Link>
    </main>
  );
}
