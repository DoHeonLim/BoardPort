/**
 * File Name : app/(public)/loading.tsx
 * Description : 로그인 전 메인 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   로그인 전 메인 페이지용 로딩 스켈레톤 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/loading.tsx 에서 app/(public)/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.14  임도헌   Modified  실제 로그인 전 메인의 히어로와 CTA 카드 비율에 맞춰 스켈레톤 구조를 전면 정리
 */

import Skeleton from "@/components/ui/Skeleton";
import mainPageStyles from "@/features/auth/components/mainPage.module.css";

export default function Loading() {
  return (
    <main
      className={`${mainPageStyles.mainPageShell} relative flex w-full flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-secondary via-brand to-brand-dark dark:from-gray-900 dark:via-brand-dark dark:to-black`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[9%] left-[8%] h-24 w-24 rounded-full bg-white/10 blur-3xl dark:bg-white/6" />
        <div className="absolute top-[18%] right-[10%] h-28 w-28 rounded-full bg-white/8 blur-3xl dark:bg-white/5" />
        <div className="absolute bottom-[22%] left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-white/7 blur-3xl dark:bg-white/4" />
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-9 px-4 pt-8 pb-28 max-[380px]:gap-8 max-[380px]:pb-24 sm:gap-11 sm:pt-10 sm:pb-24">
        <div className="flex flex-col items-center justify-center gap-5 px-5 text-center max-[380px]:gap-4 sm:gap-6">
          <Skeleton className="h-16 w-[246px] rounded-3xl bg-white/28 dark:bg-white/12 max-[380px]:w-[222px] sm:h-20 sm:w-[320px] lg:h-24 lg:w-[400px]" />

          <div className="flex w-full max-w-[19rem] flex-col items-center gap-2 max-[380px]:gap-1.5 sm:max-w-none sm:gap-2.5">
            <Skeleton className="h-7 w-56 rounded-full bg-white/24 dark:bg-white/10 max-[380px]:h-6 max-[380px]:w-48 sm:h-8 sm:w-72" />
            <Skeleton className="h-7 w-40 rounded-full bg-white/24 dark:bg-white/10 max-[380px]:h-6 max-[380px]:w-36 sm:h-8 sm:w-52" />

            <div className="mt-1 flex flex-col items-center gap-2 sm:gap-2.5">
              <Skeleton className="h-4 w-56 rounded-full bg-white/18 dark:bg-white/8 max-[380px]:h-3.5 max-[380px]:w-48 sm:h-5 sm:w-72" />
              <Skeleton className="hidden h-4 w-44 rounded-full bg-white/18 dark:bg-white/8 sm:block sm:h-5" />
            </div>
          </div>
        </div>

        <div className="z-20 w-full max-w-md px-4 pb-2 pt-1 sm:px-6 sm:pb-4">
          <div className="w-full rounded-[1.65rem] border border-white/30 bg-white/[0.16] p-4 shadow-[0_16px_38px_rgba(7,17,63,0.16)] backdrop-blur-md sm:p-5 dark:border-white/12 dark:bg-black/[0.24]">
            <Skeleton className="h-[3.15rem] w-full rounded-xl bg-white/85 dark:bg-white/12 sm:h-14" />
            <Skeleton className="mt-3 h-11 w-full rounded-xl bg-white/16 dark:bg-white/8 sm:h-12" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/18 via-white/8 to-transparent dark:from-white/8 dark:via-white/3" />
      <div className="pointer-events-none absolute -bottom-8 left-0 h-24 w-[200%] rounded-[100%] bg-white/70 blur-xl dark:bg-white/10" />
    </main>
  );
}
