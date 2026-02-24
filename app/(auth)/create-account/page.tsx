/**
 * File Name : app/(auth)/create-account/page.tsx
 * Description : 회원가입 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.01  임도헌   Modified  회원가입 페이지 추가
 * 2024.10.04  임도헌   Modified  폼 제출 유효성 검증 추가
 * 2024.12.14  임도헌   Modified  다른 방법의 로그인 링크 추가
 * 2025.04.29  임도헌   Modified  UI 수정
 * 2026.01.10  임도헌   Modified  Harbor Minimalism Theme 적용
 * 2026.01.25  임도헌   Modified  주석 보강
 */

import { UserPlusIcon } from "@heroicons/react/24/outline";
import CreateAccountForm from "@/features/auth/components/form/CreateAccountForm";

/**
 * 회원가입 페이지 컴포넌트
 *
 * - 신규 사용자 등록을 위한 페이지
 * - 회원가입 폼(`CreateAccountForm`)을 렌더링
 */
export default function CreateAccountPage() {
  return (
    <div className="flex flex-col min-h-screen px-page-x py-page-y bg-background transition-colors">
      <div className="flex flex-col items-center gap-4 mt-10 mb-8">
        <div className="p-3 bg-surface rounded-2xl shadow-sm border border-border">
          <UserPlusIcon className="size-8 text-brand dark:text-brand-light" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">선원 등록</h1>
          <p className="text-sm text-muted">
            새로운 항해를 위한 선원증을 발급받으세요
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto">
        <CreateAccountForm />
      </div>
    </div>
  );
}
