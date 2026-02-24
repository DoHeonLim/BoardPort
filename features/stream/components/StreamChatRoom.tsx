/**
 * File Name : features/stream/components/StreamChatRoom.tsx
 * Description : 스트리밍 채팅방 컴포넌트(Topbar 이벤트로 열고 닫기 위임)
 * Author : 임도헌
 *
 * History
 * 2024.11.21  임도헌   Created
 * 2024.11.21  임도헌   Modified  스트리밍 채팅방 컴포넌트
 * 2024.11.23  임도헌   Modified  스크롤 및 useRef로 최신 메시지 수신 시 하단 고정
 * 2024.12.08  임도헌   Modified  시간 표시 클라이언트로 변경
 * 2024.12.19  임도헌   Modified  supabase 클라이언트 코드 lib로 이동
 * 2025.07.31  임도헌   Modified  useStreamChatSubscription 훅 적용
 * 2025.08.23  임도헌   Modified  낙관 제거: 서버 저장 성공 → 브로드캐스트 → 구독으로 렌더
 * 2025.09.05  임도헌   Modified  바닥일 때만 자동 스크롤로 변경
 * 2025.09.06  임도헌   Modified  RATE_LIMITED 시 2초 동안 전송 버튼 잠깐 비활성화
 * 2025.09.09  임도헌   Modified  초기 스크롤 맨 아래, 중복 메시지 방지(Set),
 *                               쿨다운 자동 해제 타이머, a11y(role=log),
 *                               전송 버튼 aria-label/문구 수정
 * 2025.09.30  임도헌   Modified  데스크톱/모바일 UI 정리
 * 2025.11.16  임도헌   Modified  라이트/다크 테마 스타일 개편 + Topbar 이벤트로 열고 닫기
 * 2025.11.16  임도헌   Modified  레이아웃 유연화: 부모 컨테이너 높이를 채울 수 있게 옵션/클래스 지원, 카메라 아이콘 Host 뱃지로 대체
 * 2025.11.21  임도헌   Modified  채널 중복 사용 제거
 * 2025.11.22  임도헌   Modified  내 클라이언트에 한해 낙관 렌더 재도입
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 Input 디자인 통일
 * 2026.01.14  임도헌   Modified   주석 보강 및 코드 가독성 개선
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.05  임도헌   Modified  유저 클릭 시 StreamChatUserModal(dynamic) 오픈 로직 및 방장 권한 처리 추가
 * 2026.02.06  임도헌   Modified  메시지 호버 시 신고 아이콘(!) 노출 및 ReportModal 연동
 * 2026.02.06  임도헌   Modified  차단 시 메시지 즉시 숨김(Local Filtering) 로직 추가
 * 2026.02.22  임도헌   Modified  initialBlockedUserIds 프롭을 받아 기존 차단 유저 채팅 완벽 은닉
 */
"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { sendStreamMessageAction } from "@/features/stream/actions/chat";
import TimeAgo from "@/components/ui/TimeAgo";
import { toast } from "sonner";
import useStreamChatSubscription from "@/features/stream/hooks/useStreamChatSubscription";
import {
  PaperAirplaneIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { StreamChatMessage } from "@/features/chat/types";
import { cn } from "@/lib/utils";

const StreamChatUserModal = dynamic(() => import("./StreamChatUserModal"), {
  ssr: false,
});

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface Props {
  initialStreamMessage: StreamChatMessage[]; // 서버에서 가져온 초기 메시지 리스트
  streamChatRoomId: number; // 스트리밍 채팅방 PK
  streamChatRoomhost: number; // 방송자(Host) 유저 ID
  userId: number; // 내 유저 ID
  username: string; // 내 닉네임
  initialBlockedUserIds?: number[]; // 차단한 유저의 ID들
  fillParent?: boolean; // 부모 컨테이너의 높이를 꽉 채울지 여부
  containerClassName?: string; // 외부 주입 스타일
  onToggleExpand?: () => void; // (모바일) 채팅창 확대 토글 콜백
  isExpanded?: boolean; // (모바일) 확대 여부 상태
  showExpandToggle?: boolean; // 확대 버튼 노출 여부
}

const MAX_ITEMS = 300; // 메모리 보호를 위한 클라이언트 메시지 유지 한도

/**
 * 스트리밍 실시간 채팅창
 *
 * [기능]
 * 1. 실시간 통신: Supabase Broadcast를 통해 지연 없는 채팅 구현
 * 2. 스마트 스크롤: 사용자가 바닥을 보고 있을 때만 새 메시지 수신 시 자동 스크롤
 * 3. 도배 방지: Rate Limit 초과 시 쿨다운 UI 적용
 * 4. 관리 도구: 유저 클릭 시 '차단(강제 퇴장)' 및 '프로필 확인'이 가능한 모달 제공
 * 5. 메시지 호버 시 즉시 신고 가능한 아이콘 제공
 * 5. 반응형 대응: 데스크톱 사이드바 모드와 모바일 하단 확대 모드 지원
 */
export default function StreamChatRoom({
  initialStreamMessage,
  streamChatRoomId,
  streamChatRoomhost,
  userId,
  username,
  initialBlockedUserIds = [],
  fillParent = false,
  containerClassName = "",
  onToggleExpand,
  isExpanded,
  showExpandToggle = false,
}: Props) {
  // --- States ---
  const [messages, setMessages] =
    useState<StreamChatMessage[]>(initialStreamMessage);
  const [message, setMessage] = useState(""); // 입력 필드 텍스트
  const [cooldownUntil, setCooldownUntil] = useState<number>(0); // 쿨다운 만료 시각
  const [isOpen, setIsOpen] = useState(true); // 채팅창 표시 여부 (Topbar와 연동)
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    username: string;
    avatar: string | null;
  } | null>(null); // 클릭된 유저 정보 (모달 트리거)
  const [blockedUserIds, setBlockedUserIds] = useState<Set<number>>(
    new Set(initialBlockedUserIds)
  ); // 차단한 유저 ID 목록
  const [reportMessageId, setReportMessageId] = useState<number | null>(null); // 신고 대상 메세지 ID

  // --- Refs ---
  const chatRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendChannelRef = useRef<RealtimeChannel | null>(null);
  const atBottomRef = useRef<boolean>(true); // 스크롤 바닥 여부 추적
  const seenIdsRef = useRef<Set<string | number>>(new Set()); // 중복 메시지 방지용

  // 내가 호스트(방장)인지 판단 (차단 안내 문구 분기용)
  const isViewerHost = userId === streamChatRoomhost;

  // --- 1. Topbar 이벤트 리스너 (열기/닫기 동기화) ---
  useEffect(() => {
    const handleState = (event: Event) => {
      const { detail } = event as CustomEvent<{ open?: boolean }>;
      if (typeof detail?.open === "boolean") setIsOpen(detail.open);
    };
    window.addEventListener("stream:chat:state", handleState as EventListener);
    return () =>
      window.removeEventListener(
        "stream:chat:state",
        handleState as EventListener
      );
  }, []);

  // --- 2. 데이터 초기화 및 중복 방지 Set 갱신 ---
  useEffect(() => {
    setMessages(initialStreamMessage);
    const s = new Set<string | number>();
    initialStreamMessage.forEach((m) => s.add(m.id));
    seenIdsRef.current = s;

    // 방 진입 시 즉시 하단 스크롤
    atBottomRef.current = true;
    requestAnimationFrame(() => {
      if (chatRef.current)
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
    });
  }, [streamChatRoomId, initialStreamMessage]);

  // --- 3. 새 메시지 수신 시 스크롤 제어 ---
  useEffect(() => {
    if (chatRef.current && atBottomRef.current) {
      requestAnimationFrame(() => {
        if (chatRef.current)
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
      });
    }
  }, [messages]);

  // --- 4. 스크롤 위치 감지 로직 ---
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const onScroll = () => {
      // 바닥에서 50px 이내면 자동 스크롤 허용 상태로 간주
      atBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight <= 50;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // --- 5. 쿨다운 타이머 관리 ---
  useEffect(() => {
    if (!cooldownUntil) return;
    const ms = cooldownUntil - Date.now();
    if (ms <= 0) {
      setCooldownUntil(0);
      return;
    }
    const t = setTimeout(() => setCooldownUntil(0), ms);
    return () => clearTimeout(t);
  }, [cooldownUntil]);

  // --- 6. 실시간 구독 (Supabase Hook) ---
  const sendChannel = useStreamChatSubscription({
    streamChatRoomId,
    userId,
    ignoreSelf: false, // 다른 탭에서의 내 메시지도 받기 위함
    onReceive: (msg) => {
      if (seenIdsRef.current.has(msg.id)) return;
      seenIdsRef.current.add(msg.id);

      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > MAX_ITEMS ? next.slice(-MAX_ITEMS) : next;
      });
    },
  });

  useEffect(() => {
    if (sendChannel) sendChannelRef.current = sendChannel;
  }, [sendChannel]);

  // --- 7. 입력창 높이 자동 조절 ---
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [message]);

  // --- 8. 메시지 전송 로직 ---
  const onSubmit = async () => {
    if (Date.now() < cooldownUntil) return;
    const text = message.trim();
    if (!text) return;

    try {
      setMessage(""); // Optimistic Clear
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      const res = await sendStreamMessageAction(text, streamChatRoomId);

      if (!res.success) {
        setMessage(text); // Rollback
        if (res.error === "RATE_LIMITED") {
          setCooldownUntil(Date.now() + 2000);
          toast.error("조금 천천히 보내주세요. 🐢");
        } else {
          toast.error("메시지를 보낼 수 없습니다.");
        }
        return;
      }

      const sent = res.message;
      // 내 화면에 즉시 반영
      setMessages((prev) => {
        if (seenIdsRef.current.has(sent.id)) return prev;
        seenIdsRef.current.add(sent.id);
        const next = [...prev, sent];
        return next.length > MAX_ITEMS ? next.slice(-MAX_ITEMS) : next;
      });

      // 브로드캐스트 전송
      await sendChannelRef.current?.send({
        type: "broadcast",
        event: "message",
        payload: sent,
      });
    } catch (err) {
      setMessage(text);
      console.error(err);
      toast.error("서버 통신 오류");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent("stream:chat:state", { detail: { open: false } })
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 overflow-hidden rounded-2xl border shadow-lg transition-colors",
        "bg-surface border-border",
        "xl:h-[calc(100vh-96px)]",
        fillParent ? "h-full flex-1" : "sm:min-h-[40vh]",
        containerClassName
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-dim/50">
        <span className="text-sm font-bold text-primary">실시간 채팅</span>
        <div className="flex items-center gap-2">
          {showExpandToggle && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {isExpanded ? (
                <ArrowsPointingInIcon className="size-4" />
              ) : (
                <ArrowsPointingOutIcon className="size-4" />
              )}
            </button>
          )}
          <button
            onClick={closeChat}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Message Log */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-surface"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted">
            아직 신호가 없습니다.
          </div>
        ) : (
          messages
            .filter((msg) => !blockedUserIds.has(msg.userId)) // 차단된 유저 메시지 숨김
            .map((msg) => {
              const isMine = msg.userId === userId;
              const isHost = msg.userId === streamChatRoomhost;
              const uname = msg.user?.username ?? (isMine ? username : "선원");

              return (
                <div
                  key={msg.id}
                  className="flex flex-col items-start gap-0.5 group relative pr-6"
                >
                  <div className="flex items-center gap-1.5">
                    {/* 유저 클릭 시 관리 모달 오픈 */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedUser({
                          id: msg.userId,
                          username: uname,
                          avatar: msg.user?.avatar ?? null,
                        })
                      }
                      className="flex items-center gap-1.5 hover:bg-surface-dim px-1 -ml-1 rounded transition-colors"
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isMine
                            ? "text-brand dark:text-brand-light"
                            : "text-muted",
                          isHost && "text-accent-dark"
                        )}
                      >
                        {uname}
                      </span>
                      {isHost && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-accent/20 text-accent-dark font-bold leading-none">
                          HOST
                        </span>
                      )}
                    </button>
                    <span className="text-[10px] text-muted/50">
                      <TimeAgo date={msg.created_at.toString()} />
                    </span>
                  </div>
                  <div className="text-sm text-primary break-words whitespace-pre-wrap leading-relaxed max-w-full">
                    {msg.payload}
                  </div>
                  {/* 신고 버튼 (내 메시지가 아닐 때만, 호버 시 노출) */}
                  {!isMine && (
                    <button
                      onClick={() => setReportMessageId(msg.id)}
                      className="absolute right-0 top-1 p-1 text-muted/40 hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                      title="메시지 신고"
                    >
                      <ExclamationTriangleIcon className="size-4" />
                    </button>
                  )}
                </div>
              );
            })
        )}
      </div>

      {/* Input Section */}
      <div className="border-t border-border p-3 bg-surface">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-surface-dim rounded-[20px] px-4 py-2 border border-transparent focus-within:border-brand/50 focus-within:bg-surface transition-colors">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="메시지를 입력하세요"
              className="w-full bg-transparent border-none p-0 text-sm text-primary placeholder:text-muted resize-none max-h-[100px] focus:ring-0 leading-normal py-1"
              rows={1}
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={Date.now() < cooldownUntil || !message.trim()}
            className={cn(
              "shrink-0 size-10 rounded-full flex items-center justify-center transition-all",
              "bg-brand text-white hover:bg-brand-light active:scale-95 shadow-sm",
              "disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-muted disabled:cursor-not-allowed"
            )}
          >
            <PaperAirplaneIcon className="size-5 pl-0.5" />
          </button>
        </div>
      </div>

      {/* 유저 관리 모달 */}
      {selectedUser && (
        <StreamChatUserModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          targetUser={selectedUser}
          viewerId={userId}
          isHost={isViewerHost}
          // 차단 성공시 로컬 업데이트
          onBlockSuccess={(targetId) => {
            setBlockedUserIds((prev) => {
              const next = new Set(prev);
              next.add(targetId);
              return next;
            });
          }}
        />
      )}

      {/* 신고 모달 연결 */}
      <ReportModal
        isOpen={!!reportMessageId}
        onClose={() => setReportMessageId(null)}
        targetId={reportMessageId ?? 0}
        targetType="STREAM_MESSAGE"
      />
    </div>
  );
}
