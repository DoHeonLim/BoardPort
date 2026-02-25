/**
 * File Name : features/chat/components/SystemMessage.tsx
 * Description : 채팅방 중앙 시스템 알림 (Bubble 아님)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.19  임도헌   Created   시스템 메시지 전용 UI 분리
 */

export default function SystemMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-center my-4 px-4 w-full">
      <div className="bg-neutral-200/80 dark:bg-neutral-800/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs text-neutral-600 dark:text-neutral-400 font-medium shadow-sm text-center break-keep leading-relaxed max-w-[85%]">
        {text}
      </div>
    </div>
  );
}
