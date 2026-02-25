/**
 * File Name : app/(tabs)/products/@modal/loading.tsx
 * Description : 모달 loading 파일
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.22  임도헌   Created
 * 2024.10.22  임도헌   Modified  loading 추가
 * 2025.06.08  임도헌   Created   모달 로딩 시 기본 백드롭 적용
 */

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
