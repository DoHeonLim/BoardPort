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
 */
"use client";

import { useRef, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { sendStreamMessageAction } from "@/features/stream/actions/chat";
import TimeAgo from "@/components/ui/TimeAgo";
import { toast } from "sonner";
import useStreamChatSubscription from "@/features/stream/hooks/useStreamChatSubscription";
import {
  PaperAirplaneIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { StreamChatMessage } from "@/features/chat/types";
import { cn } from "@/lib/utils";

interface Props {
  initialStreamMessage: StreamChatMessage[]; // 최근 20개, ASC 정렬
  streamChatRoomId: number;
  streamChatRoomhost: number; // 방송자 userId
  userId: number;
  username: string; // 내 유저명 (fallback)
  /** (모바일/본문영역) 부모 높이를 꽉 채워야 할 때 true */
  fillParent?: boolean;
  /** 바깥 래퍼에 추가 클래스(선택) */
  containerClassName?: string;
  /** 모바일 전용: 채팅 확대/축소 토글 */
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  showExpandToggle?: boolean;
}

const MAX_ITEMS = 300; // 클라이언트 메모리 보호를 위한 최대 메시지 수

/**
 * 스트리밍 실시간 채팅방
 *
 * [기능]
 * 1. 초기 메시지 로드 및 실시간 메시지 수신 (Supabase)
 * 2. 메시지 전송 (Server Action) 및 Optimistic UI 처리
 * 3. 자동 스크롤 (사용자가 바닥에 있을 때만)
 * 4. 도배 방지 쿨다운 적용
 * 5. 모바일/데스크톱 반응형 레이아웃 지원
 */
export default function StreamChatRoom({
  initialStreamMessage,
  streamChatRoomId,
  streamChatRoomhost,
  userId,
  username,
  fillParent = false,
  containerClassName = "",
  onToggleExpand,
  isExpanded,
  showExpandToggle = false,
}: Props) {
  // --- State ---
  /** 메시지/입력 상태 */
  const [messages, setMessages] =
    useState<StreamChatMessage[]>(initialStreamMessage);
  const [message, setMessage] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  /** 열림/닫힘 — Topbar가 제어 (기본 true) */
  const [isOpen, setIsOpen] = useState(true);

  // --- Refs ---
  const chatRef = useRef<HTMLDivElement | null>(null); // 채팅 스크롤 영역
  const textareaRef = useRef<HTMLTextAreaElement>(null); // 입력창
  const sendChannelRef = useRef<RealtimeChannel | null>(null); // 전송용 채널 인스턴스

  // 스크롤 상태 추적: 사용자가 스크롤을 올려서 과거 메시지를 보고 있는지 여부
  // true면 새 메시지 수신 시 자동 스크롤, false면 현재 위치 유지
  const atBottomRef = useRef<boolean>(true);

  // 중복 메시지 방지용 ID Set (React StrictMode 등에서의 중복 수신 방어)
  const seenIdsRef = useRef<Set<string | number>>(new Set());

  // --- 1. Topbar 연동 (열기/닫기 상태 동기화) ---
  useEffect(() => {
    const handleState = (event: Event) => {
      const { detail } = event as CustomEvent<{ open?: boolean }>;
      if (typeof detail?.open === "boolean") setIsOpen(detail.open);
    };
    window.addEventListener("stream:chat:state", handleState as EventListener);
    // 최초 마운트 시 '열림' 상태로 동기화 신호를 보냄
    window.dispatchEvent(
      new CustomEvent("stream:chat:state", { detail: { open: true } })
    );

    return () =>
      window.removeEventListener(
        "stream:chat:state",
        handleState as EventListener
      );
  }, []);

  // --- 2. 초기 데이터 세팅 (방 변경 시) ---
  useEffect(() => {
    setMessages(initialStreamMessage);

    // 중복 방지 Set 초기화
    const s = new Set<string | number>();
    for (const m of initialStreamMessage) s.add(m.id);
    seenIdsRef.current = s;

    // 방이 바뀌면 무조건 최하단으로 스크롤 & 바닥 상태로 리셋
    atBottomRef.current = true;
    requestAnimationFrame(() => {
      if (chatRef.current)
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
    });
  }, [streamChatRoomId, initialStreamMessage]);

  // --- 3. 새 메시지 수신 시 자동 스크롤 ---
  useEffect(() => {
    if (!chatRef.current) return;
    // 사용자가 바닥에 붙어있을 때만(atBottomRef.current === true) 자동 스크롤
    if (atBottomRef.current) {
      requestAnimationFrame(() => {
        if (chatRef.current)
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
      });
    }
  }, [messages]);

  // --- 4. 최초 마운트 시 스크롤 하단 이동 (Safety) ---
  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, []);

  // --- 5. 스크롤 위치 감지 (바닥 여부 업데이트) ---
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const onScroll = () => {
      // 스크롤이 바닥에서 50px 이내면 '바닥에 있음'으로 간주
      atBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight <= 50;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // --- 6. 쿨다운 타이머 (도배 방지) ---
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

  // --- 7. 실시간 구독 (Supabase) ---
  const sendChannel = useStreamChatSubscription({
    streamChatRoomId,
    userId,
    ignoreSelf: false, // 내가 보낸 메시지도 받아서(브로드캐스트) 상태를 동기화할 수 있음 (선택)
    onReceive: (msg) => {
      // 중복 수신 방지
      if (seenIdsRef.current.has(msg.id)) return;
      seenIdsRef.current.add(msg.id);

      // 메시지 추가 (최대 개수 유지)
      setMessages((prev) => {
        const merged = [...prev, msg];
        return merged.length > MAX_ITEMS
          ? merged.slice(merged.length - MAX_ITEMS)
          : merged;
      });
    },
  });

  // 채널 인스턴스 저장 (전송용)
  useEffect(() => {
    if (sendChannel) sendChannelRef.current = sendChannel;
  }, [sendChannel]);

  // --- 8. 입력창 높이 자동 조절 ---
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto"; // 높이 초기화 후
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`; // scrollHeight에 맞춰 늘림 (최대 120px)
  }, [message]);

  // --- 9. 메시지 전송 핸들러 ---
  const onSubmit = async () => {
    if (Date.now() < cooldownUntil) return;
    const text = message.trim();
    if (!text) {
      toast.error("메시지를 입력해주세요.");
      return;
    }

    try {
      // Optimistic UI: 성공 가정하고 입력창 비움
      setMessage("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      const res = await sendStreamMessageAction(text, streamChatRoomId);

      if (!res.success) {
        // 실패 시 입력값 복구 (Rollback)
        setMessage(text);

        if (res.error === "RATE_LIMITED") {
          setCooldownUntil(Date.now() + 2000);
          toast.error("조금 천천히 보내주세요.");
        } else {
          toast.error("메시지 전송 실패");
        }
        return;
      }

      const sent = res.message;

      // 로컬 리스트에 내 메시지 즉시 추가
      setMessages((prev) => {
        const next = [...prev, sent];
        seenIdsRef.current.add(sent.id);
        return next.length > MAX_ITEMS
          ? next.slice(next.length - MAX_ITEMS)
          : next;
      });

      // 다른 클라이언트들에게 브로드캐스트
      await sendChannelRef.current?.send({
        type: "broadcast",
        event: "message",
        payload: sent,
      });
    } catch (err) {
      setMessage(text); // Rollback
      console.error(err);
      toast.error("전송 오류");
    }
  };

  // Enter 키 전송 (Shift+Enter는 줄바꿈)
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    // 닫힘 상태 전파
    window.dispatchEvent(
      new CustomEvent("stream:chat:state", { detail: { open: false } })
    );
  };

  const sendDisabled =
    Date.now() < cooldownUntil || message.trim().length === 0;

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
              title={isExpanded ? "축소" : "확대"}
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
            title="닫기"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Log */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-surface"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted">
            아직 채팅이 없습니다.
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.userId === userId;
            const host = msg.userId === streamChatRoomhost;
            const uname = msg.user?.username ?? (mine ? username : "익명");

            return (
              <div key={msg.id} className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      mine ? "text-brand dark:text-brand-light" : "text-muted",
                      host && "text-accent-dark"
                    )}
                  >
                    {uname}
                  </span>
                  {host && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-dark font-bold">
                      HOST
                    </span>
                  )}
                  <span className="text-[10px] text-muted/60">
                    <TimeAgo date={msg.created_at.toString()} />
                  </span>
                </div>
                <div className="text-sm text-primary break-words whitespace-pre-wrap leading-relaxed">
                  {msg.payload}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div
        className={cn(
          "border-t border-border p-3 bg-surface",
          "sticky bottom-0 z-10 xl:static" // 모바일 키보드 대응
        )}
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-surface-dim rounded-[20px] px-4 py-2 border border-transparent focus-within:border-brand/50 focus-within:bg-surface transition-colors">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="채팅에 참여하세요"
              className="w-full bg-transparent border-none p-0 text-sm text-primary placeholder:text-muted resize-none max-h-[100px] focus:ring-0 leading-normal py-0.5"
              rows={1}
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={sendDisabled}
            className={cn(
              "shrink-0 size-10 rounded-full flex items-center justify-center transition-all",
              "bg-brand text-white hover:bg-brand-light active:scale-95",
              "disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-muted disabled:cursor-not-allowed disabled:scale-100"
            )}
          >
            <PaperAirplaneIcon className="size-5 pl-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
