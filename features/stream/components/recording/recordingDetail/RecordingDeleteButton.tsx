/**
 * File Name : features/stream/components/recording/recordingDetail/RecordingDeleteButton.tsx
 * Description : 녹화(ENDED) 상세에서 방송/녹화 자원 삭제 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.17  임도헌   Created   라이브 상세에서 분리하여 녹화 페이지 전용으로 이동
 * 2026.01.14  임도헌   Modified  [UI] ConfirmDialog 연동 및 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.03.07  임도헌   Modified  삭제 실패 피드백 문구를 구체화(v1.2)
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/global/ConfirmDialog";

interface RecordingDeleteButtonProps {
  broadcastId: number;
  liveInputUid: string;
  username: string;
}

/**
 * 녹화본 삭제 버튼
 * - 클릭 시 삭제 확인 다이얼로그(`ConfirmDialog`)를 띄움
 * - 확인 시 삭제 API를 호출하고 채널 페이지로 이동
 */
export default function RecordingDeleteButton({
  broadcastId,
  liveInputUid,
  username,
}: RecordingDeleteButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/streams/${broadcastId}/delete?uid=${encodeURIComponent(liveInputUid)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        toast.error(
          data?.error ??
            "녹화 삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      toast.success("삭제되었습니다.");
      setConfirmOpen(false);
      router.push(`/profile/${username}/channel`);
    } catch (e) {
      console.error(e);
      toast.error(
        "녹화 삭제 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className={cn(
          "w-full h-11 rounded-xl font-medium text-sm transition-colors",
          "bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-50"
        )}
      >
        {loading ? "삭제 중..." : "녹화 삭제하기"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="녹화를 삭제할까요?"
        description="방송 기록과 모든 데이터가 영구적으로 삭제됩니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      />
    </>
  );
}
