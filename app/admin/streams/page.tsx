/**
 * File Name : app/admin/streams/page.tsx
 * Description : 관리자 방송 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   현재 라이브 목록 조회
 */

import { redirect } from "next/navigation";
import { getStreamsAdminAction } from "@/features/stream/actions/admin";
import StreamListContainer from "@/features/report/components/admin/StreamListContainer";

export const dynamic = "force-dynamic";

/**
 * 방송 관리 페이지
 * - 현재 송출 중(`CONNECTED`)인 방송 목록을 실시간으로 조회
 * - 문제 발생 시 방송을 강제 종료(Delete)하고 스트리머에게 알림을 보냄
 */
export default async function AdminStreamsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const query = searchParams.q || "";
  const result = await getStreamsAdminAction(page, query);

  if (!result.success) {
    redirect("/");
  }

  const streamData = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          실시간 방송 관리
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          현재 송출 중인 방송을 모니터링하고 강제 종료할 수 있습니다.
        </p>
      </div>

      <StreamListContainer data={streamData} />
    </div>
  );
}
