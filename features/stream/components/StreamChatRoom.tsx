/**
 * File Name : features/stream/components/StreamChatRoom.tsx
 * Description : 스트리밍 채팅방 컴포넌트(스트림 상세 Client Shell 열림 상태 연동)
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
 * 2026.03.04  임도헌   Modified  stream:chat:state 이벤트 리스너 제거 및 closeChat 액션 기반 Zustand 상태 제어로 전환
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  채팅 제어/신고 버튼 aria-label 및 hover 가시성 보강
 * 2026.03.19  임도헌   Modified  스트림 상세 우측 레일/모바일 프리뷰 구조에 맞춰 패널 톤과 높이 구조를 재정리
 * 2026.03.27  임도헌   Modified  스트림 채팅 전송 버튼에 다크 밀집 화면용 조용한 primary 톤 적용
 * 2026.03.27  임도헌   Modified  원형 전송 버튼 비율을 맞추기 위해 아이콘 전용 quiet-dark 버튼 변형 적용
 * 2026.03.21  임도헌   Modified  부모 sticky 레일 높이를 그대로 따르도록 정리하고 모바일 헤더/입력 영역 밀도를 낮춤
 * 2026.03.21  임도헌   Modified  userId 정규화 비교를 적용해 내 메시지에 신고 버튼이 잘못 노출되는 예외를 방지
 * 2026.03.24  임도헌   Modified  모바일은 메시지를 탭했을 때만 신고 액션을 노출해 채팅 몰입도를 높임
 * 2026.04.10  임도헌   Modified  삭제된 메시지 placeholder 대비를 보정해 라이트 모드 채팅 가시성 개선
 * 2026.03.24  임도헌   Modified  모바일 채팅 확대/축소 버튼을 제거하고 단일 채팅 흐름으로 단순화
 * 2026.03.24  임도헌   Modified  스트림 상세 전용 props로 채팅 열림/닫힘 상태를 제어하도록 단순화
 * 2026.03.24  임도헌   Modified  채팅 헤더 높이와 액션 버튼 밀도를 낮춰 모바일 세로 공간 활용을 보정
 * 2026.03.24  임도헌   Modified  빈 채팅 상태는 상단 쪽으로 조금 더 끌어올리고 닫기 버튼 터치 타깃을 보강해 모바일 인체공학을 보정
 * 2026.03.24  임도헌   Modified  데스크톱 라이트 모드 채팅 레일 표면 위계를 미세하게 보강해 상세 본문과의 분리감을 높임
 * 2026.03.24  임도헌   Modified  라이트 모드 입력 바 대비를 한 단계 올려 입력 영역과 전송 버튼 가시성을 보강
 * 2026.03.24  임도헌   Modified  입력 바 상단 그림자를 제거해 채팅 카드 안에서 더 평평하고 차분하게 이어지도록 조정
 * 2026.03.24  임도헌   Modified  라이트 모드 입력 바 상단선과 입력창 보더를 한 단계 낮춰 분리감이 과하지 않도록 보정
 * 2026.04.03  임도헌   Modified  제품 채팅과 문법을 맞춰 모바일 롱프레스 BottomSheet, 데스크톱 hover 더보기, 복사/신고 액션을 추가
 * 2026.04.03  임도헌   Modified  호스트 전용 메시지 삭제와 실시간 삭제 동기화 추가
 * 2026.04.03  임도헌   Modified  호스트 강제 퇴장과 일반 시청자 차단 의미를 분리
 * 2026.04.03  임도헌   Modified  방송 단위 채팅 금지 상태와 입력 비활성화 UI를 추가
 * 2026.04.03  임도헌   Modified  삭제된 메시지는 placeholder로 유지해 채팅 문맥이 끊기지 않도록 정리
 * 2026.04.03  임도헌   Modified  호스트 전용 스트림 채팅 상단 고정 공지 등록/수정/해제 UI와 실시간 동기화 추가
 * 2026.04.03  임도헌   Modified  호스트용 채팅 금지 관리 패널과 고정 공지 더보기/빠른 액션을 추가
 * 2026.04.03  임도헌   Modified  데스크톱 메시지 옵션 메뉴를 포털 기반으로 재배치하고 화면 경계/바깥 클릭 닫힘을 보강
 * 2026.04.03  임도헌   Modified  스트림 채팅 액션 라벨과 전송 실패 토스트를 1:1 채팅과 같은 톤으로 정리
 * 2026.04.03  임도헌   Modified  스트림 채팅 조회/전송 토스트를 재시도 안내 중심 문법으로 정리
 * 2026.04.08  임도헌   Modified  모바일 호스트용 채팅 금지 관리 목록은 BottomSheet, 데스크톱은 인라인 패널로 분리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 채팅 헤더·공지·메시지 메타 타이포를 정리
 * 2026.04.20  임도헌   Modified  공지/닉네임 버튼과 입력창 포커스를 게시글/녹화 댓글과 같은 공용 포커스 문법으로 정리
 * 2026.04.21  임도헌   Modified  액션 메뉴, 입력 영역, 채팅 금지 패널을 하위 컴포넌트로 분리해 책임을 정리
 * 2026.04.21  임도헌   Modified  개별 메시지 렌더를 StreamChatMessageItem으로 분리해 메시지 블록 책임을 축소
 * 2026.04.21  임도헌   Modified  고정 공지 편집 패널과 읽기 배너를 분리해 공지 흐름을 단순화
 * 2026.04.21  임도헌   Modified  채팅 금지 실시간 수신 및 전송 거부 시 입력 draft 즉시 정리
 * 2026.04.22  임도헌   Modified  개인 알림 채널 중복 구독 대신 전역 sys_event 브리지로 채팅 금지 상태를 실시간 동기화
 * 2026.05.28  임도헌   Modified  모바일 채팅 입력 집중 모드와 데스크톱 Enter 전송 정책 적용
 * 2026.05.28  임도헌   Modified  입력 집중 모드에서 카드형 채팅을 라이브 피드형 레이아웃으로 전환
 * 2026.05.28  임도헌   Modified  모바일 스트림 채팅 헤더와 입력바 밀도 압축
 * 2026.05.28  임도헌   Modified  스크롤 이탈 상태의 새 채팅 하단 이동 버튼 추가
 * 2026.05.28  임도헌   Modified  새 메시지 수신 시 실제 DOM 스크롤 위치 기준으로 자동 하단 이동 여부 판별
 * 2026.05.28  임도헌   Modified  채팅 로그 scroll anchoring 비활성화로 새 메시지 수신 중 위치 보존
 * 2026.05.28  임도헌   Modified  새 채팅 이동 버튼을 중앙 아이콘형 플로팅 버튼으로 정리
 * 2026.05.29  임도헌   Modified  max-lg 채팅 레이아웃과 모바일 상호작용 판정 기준을 1024px로 일치
 */
"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import BottomSheet from "@/components/global/BottomSheet";
import { toast } from "sonner";
import useStreamChatSubscription from "@/features/stream/hooks/useStreamChatSubscription";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import type { StreamChatMessage } from "@/features/chat/types";
import {
  deleteStreamMessageAction,
  getMutedStreamViewerListAction,
  sendStreamMessageAction,
  toggleStreamChatMuteAction,
  updatePinnedChatNoticeAction,
} from "@/features/stream/actions/chat";
import { STREAM_PINNED_NOTICE_MAX_LENGTH } from "@/features/stream/constants";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import type {
  MutedStreamViewer,
  StreamMetaUpdatePayload,
} from "@/features/stream/types";
import StreamChatActionMenuItems from "./StreamChatActionMenuItems";
import StreamChatComposer from "./StreamChatComposer";
import StreamChatMessageItem from "./StreamChatMessageItem";
import StreamChatMutedViewerPanel from "./StreamChatMutedViewerPanel";
import StreamChatPinnedNoticeBanner from "./StreamChatPinnedNoticeBanner";
import StreamChatPinnedNoticeEditor from "./StreamChatPinnedNoticeEditor";

const StreamChatUserModal = dynamic(() => import("./StreamChatUserModal"), {
  ssr: false,
});

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface Props {
  initialStreamMessage: StreamChatMessage[]; // 서버에서 가져온 초기 메시지 리스트
  streamId: number; // 현재 방송 ID
  streamChatRoomId: number; // 스트리밍 채팅방 PK
  streamChatRoomhost: number; // 방송자(Host) 유저 ID
  userId: number; // 내 유저 ID
  username: string; // 내 닉네임
  initialBlockedUserIds?: number[]; // 차단한 유저의 ID들
  initialMutedUserIds?: number[]; // 호스트 기준 초기 채팅 금지 대상 유저 ID들
  initiallyMuted?: boolean; // 현재 시청자의 초기 채팅 금지 상태
  initialPinnedChatNotice?: string | null; // 채팅 상단 고정 공지 초기값
  fillParent?: boolean; // 부모 컨테이너의 높이를 꽉 채울지 여부
  containerClassName?: string; // 외부 주입 스타일
  isOpen?: boolean; // 채팅 노출 여부
  onCloseChat?: () => void; // 채팅 닫기 핸들러
  onComposerFocusChange?: (focused: boolean) => void; // 모바일 입력 집중 모드 전환용 포커스 상태 전달
  isFocusMode?: boolean; // 모바일 키보드 오픈 중 라이브 채팅형 레이아웃 여부
  onStreamMetaUpdated?: (payload: StreamMetaUpdatePayload) => void; // 방송 제목/설명 실시간 동기화
}

const MAX_ITEMS = 300; // 메모리 보호를 위한 클라이언트 메시지 유지 한도

/**
 * 스트리밍 실시간 채팅방 컴포넌트
 *
 * [상태 주입 및 상호작용 제어 로직]
 * - 스트림 상세 Client Shell에서 내려주는 props를 통한 모바일/데스크톱 채팅창 표시 여부와 닫기 액션 제어
 * - Supabase 기반 `useStreamChatSubscription`을 통한 실시간 채팅 메시지 수신 및 전송 성공 직후 내 화면 낙관 반영
 * - 쿨다운 타이머(Rate Limit) 적용 및 스크롤 바닥 감지 기반 자동 스크롤 로직 제공
 * - 메시지 신고, 유저 프로필 미니 모달, 차단/강제 퇴장 후 로컬 메시지 숨김까지의 채팅 내부 처리
 */
export default function StreamChatRoom({
  initialStreamMessage,
  streamId,
  streamChatRoomId,
  streamChatRoomhost,
  userId,
  username,
  initialBlockedUserIds = [],
  initialMutedUserIds = [],
  initiallyMuted = false,
  initialPinnedChatNotice = null,
  fillParent = false,
  containerClassName = "",
  isOpen = true,
  onCloseChat,
  onComposerFocusChange,
  isFocusMode = false,
  onStreamMetaUpdated,
}: Props) {
  const isMobile = useIsMobile(1024);

  /**
   * 숫자/문자열 혼용으로 내려오는 userId를 안전하게 비교
   * 스트림 액션 권한 분기에서 1과 "1"을 같은 사용자로 취급하기 위한 정규화 유틸
   */
  const isSameUser = (
    left: number | string | null | undefined,
    right: number | string | null | undefined
  ) => {
    const normalizedLeft = Number(left);
    const normalizedRight = Number(right);

    if (Number.isFinite(normalizedLeft) && Number.isFinite(normalizedRight)) {
      return normalizedLeft === normalizedRight;
    }

    return String(left) === String(right);
  };

  // --- States ---
  const [messages, setMessages] =
    useState<StreamChatMessage[]>(initialStreamMessage);
  const [message, setMessage] = useState(""); // 입력 필드 텍스트
  const [isComposing, setIsComposing] = useState(false); // IME 조합 상태
  const [cooldownUntil, setCooldownUntil] = useState<number>(0); // 쿨다운 만료 시각

  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    username: string;
    avatar: string | null;
  } | null>(null); // 클릭된 유저 정보 (모달 트리거)
  const [blockedUserIds, setBlockedUserIds] = useState<Set<number>>(
    new Set(initialBlockedUserIds)
  ); // 차단한 유저 ID 목록
  const [mutedUserIds, setMutedUserIds] = useState<Set<number>>(
    new Set(initialMutedUserIds)
  ); // 호스트 기준 채팅 금지 대상 유저 ID 목록
  const [isMuted, setIsMuted] = useState(initiallyMuted); // 현재 시청자의 채팅 금지 상태
  const [pinnedNotice, setPinnedNotice] = useState<string | null>(
    initialPinnedChatNotice
  ); // 채팅 상단 고정 공지
  const [isPinnedNoticeExpanded, setIsPinnedNoticeExpanded] = useState(false); // 고정 공지 펼침 여부
  const [showPinnedNoticeEditor, setShowPinnedNoticeEditor] = useState(false); // 호스트 공지 편집 패널 노출 여부
  const [pinnedNoticeDraft, setPinnedNoticeDraft] = useState(
    initialPinnedChatNotice ?? ""
  ); // 호스트 공지 편집 draft
  const [showMutedViewerPanel, setShowMutedViewerPanel] = useState(false); // 호스트용 채팅 금지 관리 목록 노출 여부 (모바일 BottomSheet / 데스크톱 인라인 패널)
  const [mutedViewers, setMutedViewers] = useState<MutedStreamViewer[]>([]); // 현재 방송 채팅 금지 대상 목록
  const [reportMessageId, setReportMessageId] = useState<number | null>(null); // 신고 대상 메세지 ID
  const [menuMessageId, setMenuMessageId] = useState<number | null>(null); // 데스크톱 액션 메뉴 대상 메시지 ID
  const [sheetMessage, setSheetMessage] = useState<StreamChatMessage | null>(
    null
  ); // 모바일 BottomSheet 대상 메시지
  const [desktopMenuPosition, setDesktopMenuPosition] = useState<{
    top: number;
    left: number;
    openBelow: boolean;
  } | null>(null); // 데스크톱 액션 메뉴 포털 위치
  const [isSavingPinnedNotice, setIsSavingPinnedNotice] = useState(false); // 고정 공지 저장/해제 로딩 상태
  const [isRefreshingMutedViewers, setIsRefreshingMutedViewers] =
    useState(false); // 채팅 금지 대상 목록 조회/해제 로딩 상태
  const [showJumpToLatest, setShowJumpToLatest] = useState(false); // 새 채팅 하단 이동 버튼 노출 여부
  const [unreadMessageCount, setUnreadMessageCount] = useState(0); // 스크롤 이탈 중 수신한 새 메시지 수

  // --- Refs ---
  const chatRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingAutoScrollRef = useRef(false); // 메시지 반영 직후 하단 이동이 필요한지 추적
  const seenIdsRef = useRef<Set<string | number>>(new Set()); // 중복 메시지 방지용
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  // 내가 호스트(방장)인지 판단 (차단 안내 문구 분기용)
  const isViewerHost = userId === streamChatRoomhost;

  const isChatAtBottom = useCallback((threshold = 50) => {
    const el = chatRef.current;
    if (!el) return true;

    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, []);

  const scrollChatToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (!chatRef.current) return;

      chatRef.current.scrollTop = chatRef.current.scrollHeight;
      pendingAutoScrollRef.current = false;
      setShowJumpToLatest(false);
      setUnreadMessageCount(0);
    });
  }, []);

  // 모바일 전송 탭 시 버튼으로 포커스가 이동하며 키보드가 닫히는 현상 방지
  const preventFocusSteal = (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  // 채팅 제한 전환 시 입력 draft와 textarea 높이를 즉시 초기 상태로 복귀
  const clearComposerDraft = () => {
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  /**
   * 삭제 브로드캐스트를 현재 메시지 배열과 액션 메뉴 상태에 동기화
   * placeholder 렌더 유지 및 이미 열린 데스크톱/모바일 메뉴 동시 닫기
   */
  const markMessageDeleted = (messageId: number, deleted_at: Date) => {
    setMessages((prev) =>
      prev.map((item) =>
        Number(item.id) === messageId ? { ...item, deleted_at } : item
      )
    );
    setMenuMessageId((prev) => (prev === messageId ? null : prev));
    setSheetMessage((prev) =>
      prev && Number(prev.id) === messageId ? null : prev
    );
  };

  // --- 1. 데이터 초기화 및 중복 방지 Set 갱신 ---
  useEffect(() => {
    setMessages(initialStreamMessage);
    setMenuMessageId(null);
    setSheetMessage(null);
    setMutedUserIds(new Set(initialMutedUserIds));
    setIsMuted(initiallyMuted);
    setPinnedNotice(initialPinnedChatNotice);
    setIsPinnedNoticeExpanded(false);
    setPinnedNoticeDraft(initialPinnedChatNotice ?? "");
    setShowPinnedNoticeEditor(false);
    setShowMutedViewerPanel(false);
    setMutedViewers([]);
    setShowJumpToLatest(false);
    setUnreadMessageCount(0);
    const s = new Set<string | number>();
    initialStreamMessage.forEach((m) => s.add(m.id));
    seenIdsRef.current = s;

    // 방 진입 시 즉시 하단 스크롤
    pendingAutoScrollRef.current = true;
    scrollChatToBottom();
  }, [
    streamChatRoomId,
    initialStreamMessage,
    initialMutedUserIds,
    initiallyMuted,
    initialPinnedChatNotice,
    scrollChatToBottom,
  ]);

  // --- 2. 새 메시지 수신 시 스크롤 제어 ---
  useEffect(() => {
    if (chatRef.current && pendingAutoScrollRef.current) {
      scrollChatToBottom();
    }
  }, [messages, scrollChatToBottom]);

  // --- 3. 스크롤 위치 감지 로직 ---
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const onScroll = () => {
      // 바닥에서 50px 이내인 경우 자동 스크롤 허용 상태로 간주
      const isAtBottom = isChatAtBottom();
      if (isAtBottom) {
        pendingAutoScrollRef.current = false;
        setShowJumpToLatest(false);
        setUnreadMessageCount(0);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isChatAtBottom]);

  // --- 4. 쿨다운 타이머 관리 ---
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

  // --- 5. 실시간 구독 (Supabase Hook) ---
  useStreamChatSubscription({
    streamChatRoomId,
    userId,
    ignoreSelf: false, // 다른 탭에서의 내 메시지도 받기 위함
    onReceive: (msg) => {
      if (seenIdsRef.current.has(msg.id)) return;
      seenIdsRef.current.add(msg.id);

      const shouldStickToBottom =
        isChatAtBottom() || Number(msg.userId) === userId;

      if (shouldStickToBottom) {
        pendingAutoScrollRef.current = true;
        setShowJumpToLatest(false);
        setUnreadMessageCount(0);
      } else {
        pendingAutoScrollRef.current = false;
        setShowJumpToLatest(true);
        setUnreadMessageCount((prev) => prev + 1);
      }

      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > MAX_ITEMS ? next.slice(-MAX_ITEMS) : next;
      });
    },
    onDelete: ({ messageId, deleted_at }) => {
      markMessageDeleted(messageId, deleted_at);
    },
    onPinnedNoticeUpdate: ({ notice }) => {
      setPinnedNotice(notice);
      setIsPinnedNoticeExpanded(false);
      setPinnedNoticeDraft(notice ?? "");
      setShowPinnedNoticeEditor(false);
    },
    onStreamMetaUpdate: onStreamMetaUpdated,
  });

  useEffect(() => {
    if (!userId || isViewerHost) return;

    // NotificationListener가 발행한 전역 운영 이벤트 중
    // 현재 방송의 채팅 금지/해제만 골라 입력 상태와 토스트를 즉시 동기화
    const handleMuteState = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          type?: "STREAM_CHAT_MUTED" | "STREAM_CHAT_UNMUTED";
          streamId?: number;
        }>
      ).detail;

      if (Number(detail?.streamId) !== streamId) return;

      if (detail?.type === "STREAM_CHAT_MUTED") {
        setIsMuted(true);
        clearComposerDraft();
        toast.error("호스트에 의해 현재 방송 채팅이 제한되었습니다.");
        return;
      }

      if (detail?.type === "STREAM_CHAT_UNMUTED") {
        setIsMuted(false);
        toast.success("현재 방송 채팅 제한이 해제되었습니다.");
      }
    };

    window.addEventListener("app:sys-event", handleMuteState as EventListener);

    return () => {
      window.removeEventListener(
        "app:sys-event",
        handleMuteState as EventListener
      );
    };
  }, [isViewerHost, streamId, userId]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => clearLongPressTimer, []);

  useEffect(() => {
    if (isMobile || !menuMessageId) {
      setDesktopMenuPosition(null);
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        menuRef.current?.contains(target) ||
        activeMenuButtonRef.current?.contains(target)
      ) {
        return;
      }

      setMenuMessageId(null);
      setDesktopMenuPosition(null);
    };

    const onWindowChange = () => {
      setMenuMessageId(null);
      setDesktopMenuPosition(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    };
  }, [isMobile, menuMessageId]);

  const shouldCollapsePinnedNotice = !!pinnedNotice
    ? pinnedNotice.length > 96 || pinnedNotice.includes("\n")
    : false;

  const collapsedPinnedNotice = pinnedNotice
    ? pinnedNotice.replace(/\s+/g, " ").trim().slice(0, 96).trimEnd()
    : "";

  /**
   * 호스트의 채팅 금지 관리 패널 열기 시 현재 대상 목록 조회
   * 모바일/데스크톱의 동일 데이터 공유를 위한 상위 조회 함수 관리
   */
  const loadMutedViewers = () => {
    if (!isViewerHost) return;

    void (async () => {
      try {
        setIsRefreshingMutedViewers(true);
        const result = await getMutedStreamViewerListAction(streamId);

        if (!result.success) {
          toast.error(
            "채팅 금지 대상을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          );
          return;
        }

        setMutedViewers(result.viewers);
      } finally {
        setIsRefreshingMutedViewers(false);
      }
    })();
  };

  // --- 6. 입력창 높이 자동 조절 ---
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [message]);

  // --- 7. 메시지 전송 로직 ---
  const onSubmit = async () => {
    if (Date.now() < cooldownUntil) return;
    if (isMuted) {
      clearComposerDraft();
      toast.error("현재 방송에서 채팅이 제한되어 있습니다.");
      return;
    }
    const text = message.trim();
    if (!text) return;

    try {
      clearComposerDraft(); // Optimistic Clear

      const res = await sendStreamMessageAction(text, streamChatRoomId);

      if (!res.success) {
        setMessage(text); // Rollback
        if (res.error === "RATE_LIMITED") {
          setCooldownUntil(Date.now() + 2000);
          toast.error("조금 천천히 보내주세요. 🐢");
        } else if (res.error === "MUTED") {
          setIsMuted(true);
          clearComposerDraft();
          toast.error("현재 방송에서 채팅이 제한되어 있습니다.");
        } else {
          toast.error(
            "메시지를 전송하지 못했습니다. 잠시 후 다시 시도해주세요."
          );
        }
        return;
      }

      const sent = res.message;
      // 내 화면에 즉시 반영
      pendingAutoScrollRef.current = true;
      setMessages((prev) => {
        if (seenIdsRef.current.has(sent.id)) return prev;
        seenIdsRef.current.add(sent.id);
        const next = [...prev, sent];
        return next.length > MAX_ITEMS ? next.slice(-MAX_ITEMS) : next;
      });
      textareaRef.current?.focus();
    } catch (err) {
      setMessage(text);
      console.error(err);
      toast.error("서버와 통신하지 못했습니다. 잠시 후 다시 시도해주세요.");
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isDesktopInput =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (e.key === "Enter" && !e.shiftKey && !isComposing && isDesktopInput) {
      e.preventDefault();
      onSubmit();
    }
  };

  // 스트림 상세 셸의 닫기 액션 직접 호출을 통한 모바일/데스크톱 상태 동시 정렬
  const closeChat = () => {
    onCloseChat?.();
  };

  // 복사 성공/실패 토스트와 함께 현재 열려 있는 액션 UI 정리
  const handleCopyMessage = async (payload: string) => {
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("메시지를 복사했습니다.");
      setMenuMessageId(null);
      setSheetMessage(null);
    } catch {
      toast.error("메시지 복사에 실패했습니다.");
    }
  };

  // 신고 모달의 단일 대상 처리에 맞춘 메뉴 상태 선정리 및 messageId만 보존
  const handleOpenReport = (messageId: number) => {
    setMenuMessageId(null);
    setSheetMessage(null);
    setReportMessageId(messageId);
  };

  /**
   * 호스트 메시지 삭제 액션
   * 서버 삭제 성공 후 placeholder 유지형 로컬 반영의 즉시 적용 및 채팅 문맥 단절 방지
   */
  const handleDeleteMessage = async (messageId: number) => {
    const res = await deleteStreamMessageAction(messageId);
    if (!res.success) {
      toast.error(
        res.error === "FORBIDDEN"
          ? "호스트만 메시지를 삭제할 수 있습니다."
          : "메시지를 삭제할 수 없습니다."
      );
      return;
    }

    const deleted_at = new Date(res.deleted_at);
    markMessageDeleted(messageId, deleted_at);
    setMenuMessageId(null);
    setSheetMessage(null);
    toast.success("메시지를 삭제했습니다.");
  };

  /**
   * 상단 고정 공지 저장 또는 신규 등록
   * 저장 성공 시 draft, 펼침 상태, 편집 패널의 일괄 정리 및 읽기 모드 복귀
   */
  const handleSavePinnedNotice = () => {
    if (!isViewerHost) return;

    void (async () => {
      try {
        setIsSavingPinnedNotice(true);
        const nextNotice = pinnedNoticeDraft.trim();
        const result = await updatePinnedChatNoticeAction(
          streamId,
          nextNotice || null
        );

        if (!result.success) {
          if (result.error === "NOTICE_TOO_LONG") {
            toast.error(
              `고정 공지는 ${STREAM_PINNED_NOTICE_MAX_LENGTH}자 이하로 입력해주세요.`
            );
          } else if (result.error === "FORBIDDEN") {
            toast.error("호스트만 고정 공지를 수정할 수 있습니다.");
          } else {
            toast.error("고정 공지를 저장하지 못했습니다.");
          }
          return;
        }

        setPinnedNotice(result.notice);
        setIsPinnedNoticeExpanded(false);
        setPinnedNoticeDraft(result.notice ?? "");
        setShowPinnedNoticeEditor(false);
        toast.success(
          result.notice
            ? "고정 공지를 저장했습니다."
            : "고정 공지를 해제했습니다."
        );
      } finally {
        setIsSavingPinnedNotice(false);
      }
    })();
  };

  // 고정 공지 제거의 별도 액션 분리 및 저장 버튼과 다른 성공/실패 문구 유지
  const handleClearPinnedNotice = () => {
    if (!isViewerHost) return;

    void (async () => {
      try {
        setIsSavingPinnedNotice(true);
        const result = await updatePinnedChatNoticeAction(streamId, null);

        if (!result.success) {
          toast.error("고정 공지를 해제하지 못했습니다.");
          return;
        }

        setPinnedNotice(null);
        setIsPinnedNoticeExpanded(false);
        setPinnedNoticeDraft("");
        setShowPinnedNoticeEditor(false);
        toast.success("고정 공지를 해제했습니다.");
      } finally {
        setIsSavingPinnedNotice(false);
      }
    })();
  };

  /**
   * 채팅 금지 해제 성공 시 패널 목록과 muted 집합의 동시 갱신
   * 추가 조회 없이 현재 열린 관리 패널에서 바로 결과 확인 가능 상태 유지
   */
  const handleUnmuteViewer = (target: MutedStreamViewer) => {
    void (async () => {
      try {
        setIsRefreshingMutedViewers(true);
        const result = await toggleStreamChatMuteAction(
          streamId,
          target.id,
          "unmute"
        );

        if (!result.success) {
          toast.error("채팅 금지를 해제하지 못했습니다.");
          return;
        }

        setMutedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(target.id);
          return next;
        });
        setMutedViewers((prev) =>
          prev.filter((viewer) => viewer.id !== target.id)
        );
        toast.success(`${target.username}님의 채팅 금지를 해제했습니다.`);
      } finally {
        setIsRefreshingMutedViewers(false);
      }
    })();
  };

  /**
   * 모바일 롱프레스 시작점
   * 미세한 탭과의 구분을 위한 짧은 지연 뒤 BottomSheet 열기 예약
   */
  const handleLongPressStart = (msg: StreamChatMessage) => {
    if (!isMobile || msg.deleted_at) return;

    clearLongPressTimer();
    didLongPressRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      setSheetMessage(msg);
    }, 420);
  };

  // 롱프레스 종료/이동/취소 시 타이머 정리 및 일반 탭과의 충돌 방지
  const handleLongPressEnd = () => {
    clearLongPressTimer();
  };

  /**
   * 데스크톱 포털 메뉴 위치 계산
   * 화면 경계와 헤더 높이를 고려한 위/아래 방향 결정 및 좌우 안전 여백 내부 clamp
   */
  const openDesktopActionMenu = (
    messageId: number,
    trigger: HTMLButtonElement,
    isMine: boolean,
    canReport: boolean
  ) => {
    const MENU_WIDTH = 176;
    const SAFE_GUTTER = 12;
    const SAFE_TOP = 72;
    const ESTIMATED_MENU_HEIGHT =
      (isViewerHost ? 1 : 0) + 1 + (canReport ? 1 : 0) >= 3 ? 152 : 104;
    const rect = trigger.getBoundingClientRect();
    const roomBelow = window.innerHeight - rect.bottom;
    const openBelow =
      roomBelow >= ESTIMATED_MENU_HEIGHT + SAFE_GUTTER ||
      rect.top < SAFE_TOP + ESTIMATED_MENU_HEIGHT;
    const rawLeft = isMine ? rect.right - MENU_WIDTH : rect.left;
    const left = Math.min(
      Math.max(SAFE_GUTTER, rawLeft),
      window.innerWidth - MENU_WIDTH - SAFE_GUTTER
    );

    activeMenuButtonRef.current = trigger;
    setMenuMessageId(messageId);
    setDesktopMenuPosition({
      top: openBelow ? rect.bottom + 8 : rect.top - 8,
      left,
      openBelow,
    });
  };

  if (!isOpen) return null;

  const desktopMenu =
    menuMessageId && !isMobile && desktopMenuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[70] w-44 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl"
            style={{
              top: desktopMenuPosition.top,
              left: desktopMenuPosition.left,
              transform: desktopMenuPosition.openBelow
                ? "translateY(0)"
                : "translateY(-100%)",
            }}
          >
            {(() => {
              const activeMessage = messages.find(
                (item) => Number(item.id) === menuMessageId
              );

              if (!activeMessage || activeMessage.deleted_at) return null;

              return (
                <StreamChatActionMenuItems
                  message={activeMessage}
                  isViewerHost={isViewerHost}
                  isMine={isSameUser(activeMessage.userId, userId)}
                  className="focus-ring-soft flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
                  onDelete={handleDeleteMessage}
                  onCopy={handleCopyMessage}
                  onReport={handleOpenReport}
                />
              );
            })()}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={cn(
        "relative flex flex-col min-h-0 overflow-hidden border transition-colors",
        "border-border-subtle bg-surface",
        "rounded-2xl shadow-lg lg:shadow-[0_16px_36px_rgba(15,23,42,0.08)] lg:ring-1 lg:ring-black/[0.045] dark:lg:ring-white/[0.04]",
        "max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:bg-background max-lg:shadow-none",
        fillParent ? "h-full flex-1" : "sm:min-h-[40vh]",
        containerClassName
      )}
    >
      {/* 헤더 */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-between border-b border-border-subtle bg-surface px-3 py-2 sm:px-4 sm:py-3",
          isFocusMode && "max-lg:hidden",
          !isFocusMode && "max-lg:bg-background"
        )}
      >
        <div className="min-w-0">
          <span className="text-sm font-medium text-primary">채팅</span>
        </div>
        <div className="flex items-center gap-2">
          {isViewerHost && (
            <>
              <button
                type="button"
                onClick={() => {
                  setPinnedNoticeDraft(pinnedNotice ?? "");
                  setShowPinnedNoticeEditor((prev) => !prev);
                }}
                className={cn(
                  "focus-ring-soft inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors sm:text-sm",
                  showPinnedNoticeEditor
                    ? "border-brand/40 bg-brand/10 text-brand dark:border-brand-light/35 dark:bg-brand-light/10 dark:text-brand-light"
                    : "border-border-subtle bg-surface text-muted hover:bg-surface-dim hover:text-primary"
                )}
              >
                <MegaphoneIcon className="size-4" />
                <span className="sm:hidden">공지</span>
                <span className="hidden sm:inline">
                  {pinnedNotice ? "공지 수정" : "공지 등록"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !showMutedViewerPanel;
                  setShowMutedViewerPanel(next);
                  if (next) loadMutedViewers();
                }}
                className={cn(
                  "focus-ring-soft inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors sm:text-sm",
                  showMutedViewerPanel
                    ? "border-brand/40 bg-brand/10 text-brand dark:border-brand-light/35 dark:bg-brand-light/10 dark:text-brand-light"
                    : "border-border-subtle bg-surface text-muted hover:bg-surface-dim hover:text-primary"
                )}
              >
                {showMutedViewerPanel ? (
                  <ChevronUpIcon className="size-4" />
                ) : (
                  <ChevronDownIcon className="size-4" />
                )}
                <span className="sm:hidden">관리</span>
                <span className="hidden sm:inline">채팅 관리</span>
              </button>
            </>
          )}
          <button
            onClick={closeChat}
            aria-label="채팅 닫기"
            className="focus-ring-soft inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
      </div>

      {isViewerHost && showMutedViewerPanel && !isMobile && (
        <div className="shrink-0 border-b border-border-subtle bg-surface px-3 py-3 sm:px-4">
          <StreamChatMutedViewerPanel
            mutedViewers={mutedViewers}
            isRefreshing={isRefreshingMutedViewers}
            onUnmute={handleUnmuteViewer}
          />
        </div>
      )}

      {isViewerHost && showPinnedNoticeEditor && (
        <StreamChatPinnedNoticeEditor
          draft={pinnedNoticeDraft}
          initialNotice={pinnedNotice}
          isSaving={isSavingPinnedNotice}
          onChange={setPinnedNoticeDraft}
          onCancel={() => {
            setPinnedNoticeDraft(pinnedNotice ?? "");
            setShowPinnedNoticeEditor(false);
          }}
          onClear={handleClearPinnedNotice}
          onSave={handleSavePinnedNotice}
        />
      )}

      {!!pinnedNotice && (
        <StreamChatPinnedNoticeBanner
          notice={pinnedNotice}
          isViewerHost={isViewerHost}
          isSaving={isSavingPinnedNotice}
          isExpanded={isPinnedNoticeExpanded}
          shouldCollapse={shouldCollapsePinnedNotice}
          collapsedNotice={collapsedPinnedNotice}
          onToggleExpanded={() => setIsPinnedNoticeExpanded((prev) => !prev)}
          onEdit={() => {
            setPinnedNoticeDraft(pinnedNotice ?? "");
            setShowPinnedNoticeEditor(true);
          }}
          onClear={handleClearPinnedNotice}
        />
      )}

      {/* 메시지 로그 */}
      <div
        ref={chatRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto bg-surface p-3 pb-3 space-y-3 scrollbar-hide [overflow-anchor:none] sm:p-4 sm:pb-5",
          "max-lg:bg-background",
          isFocusMode &&
            "max-lg:px-3 max-lg:pt-2.5 max-lg:pb-2 max-lg:space-y-2"
        )}
        role="log"
        aria-live="polite"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setMenuMessageId(null);
            setSheetMessage(null);
          }
        }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-start px-4 pt-10 text-center sm:justify-center sm:pt-0">
            <div className="rounded-full border border-border-subtle bg-surface-dim/70 px-3 py-1 text-xs font-medium tracking-[0.14em] text-muted">
              교신 대기
            </div>
            <p className="mt-4 text-sm font-medium text-muted">
              아직 신호가 없습니다.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted/80">
              첫 메시지를 남겨 선원들과 대화를 시작해보세요.
            </p>
          </div>
        ) : (
          messages
            .filter((msg) => !blockedUserIds.has(msg.userId)) // 차단된 유저 메시지 숨김
            .map((msg) => (
              <StreamChatMessageItem
                key={msg.id}
                message={msg}
                currentUserId={userId}
                currentUsername={username}
                hostUserId={streamChatRoomhost}
                activeMenuMessageId={menuMessageId}
                onSelectUser={setSelectedUser}
                onLongPressStart={handleLongPressStart}
                onLongPressEnd={handleLongPressEnd}
                onOptionButtonClick={(event, activeMessage, isMine) => {
                  event.stopPropagation();

                  // 모바일 롱프레스 직후 버튼 탭 연속 입력 시 데스크톱 메뉴 중복 열림 방지
                  if (didLongPressRef.current) {
                    didLongPressRef.current = false;
                    return;
                  }

                  if (menuMessageId === Number(activeMessage.id)) {
                    setMenuMessageId(null);
                    setDesktopMenuPosition(null);
                    activeMenuButtonRef.current = null;
                    return;
                  }

                  openDesktopActionMenu(
                    Number(activeMessage.id),
                    event.currentTarget,
                    isMine,
                    !isMine
                  );
                }}
                isFocusMode={isFocusMode}
              />
            ))
        )}
      </div>

      {showJumpToLatest && (
        <button
          type="button"
          onClick={scrollChatToBottom}
          className={cn(
            "focus-ring-strong absolute left-1/2 z-20 inline-flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-brand/30 bg-brand text-white shadow-lg transition-colors hover:bg-brand-dark",
            "bottom-[4.5rem]",
            isFocusMode && "max-lg:bottom-[3.75rem]"
          )}
          aria-label="새 채팅으로 이동"
        >
          <ChevronDownIcon className="size-[18px]" aria-hidden="true" />
          {unreadMessageCount > 1 && (
            <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground shadow-sm">
              {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
            </span>
          )}
        </button>
      )}

      <StreamChatComposer
        isMuted={isMuted}
        message={message}
        textareaRef={textareaRef}
        onChange={setMessage}
        onKeyDown={onKeyDown}
        onFocus={() => onComposerFocusChange?.(true)}
        onBlur={() => onComposerFocusChange?.(false)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onSubmit={onSubmit}
        preventFocusSteal={preventFocusSteal}
        isFocusMode={isFocusMode}
        isSubmitDisabled={
          isMuted || Date.now() < cooldownUntil || !message.trim()
        }
      />

      {/* 유저 관리 모달 */}
      {selectedUser && (
        <StreamChatUserModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          targetUser={selectedUser}
          viewerId={userId}
          isHost={isViewerHost}
          streamId={streamId}
          isTargetMuted={mutedUserIds.has(selectedUser.id)}
          // 차단/강제 퇴장 성공 시 로컬 업데이트
          onModerationSuccess={({ targetId, kind, muted }) => {
            if (kind === "block") {
              setBlockedUserIds((prev) => {
                const next = new Set(prev);
                next.add(targetId);
                return next;
              });
            }

            if (kind === "mute") {
              setMutedUserIds((prev) => {
                const next = new Set(prev);
                if (muted) next.add(targetId);
                else next.delete(targetId);
                return next;
              });

              if (showMutedViewerPanel) {
                if (muted && selectedUser && selectedUser.id === targetId) {
                  setMutedViewers((prev) => {
                    if (prev.some((viewer) => viewer.id === targetId)) {
                      return prev;
                    }

                    return [
                      {
                        id: selectedUser.id,
                        username: selectedUser.username,
                        avatar: selectedUser.avatar ?? null,
                      },
                      ...prev,
                    ];
                  });
                } else if (!muted) {
                  setMutedViewers((prev) =>
                    prev.filter((viewer) => viewer.id !== targetId)
                  );
                }
              }
            }
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

      {isMobile && !!sheetMessage && !sheetMessage.deleted_at && (
        <BottomSheet
          open={!!sheetMessage}
          title="메시지 옵션"
          description="원하는 작업을 선택해주세요."
          onClose={() => setSheetMessage(null)}
          contentClassName="pt-2"
        >
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
            <StreamChatActionMenuItems
              message={sheetMessage}
              isViewerHost={isViewerHost}
              isMine={isSameUser(sheetMessage.userId, userId)}
              className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
              onDelete={handleDeleteMessage}
              onCopy={handleCopyMessage}
              onReport={handleOpenReport}
            />
          </div>
          <button
            type="button"
            onClick={() => setSheetMessage(null)}
            className="mt-3 w-full rounded-2xl border border-border-subtle bg-background px-4 py-3 text-sm font-medium text-primary"
          >
            닫기
          </button>
        </BottomSheet>
      )}

      {isMobile && isViewerHost && showMutedViewerPanel && (
        <BottomSheet
          open={showMutedViewerPanel}
          title="채팅 금지 관리"
          description="현재 방송에서 채팅이 제한된 시청자를 보고 바로 해제할 수 있습니다."
          onClose={() => setShowMutedViewerPanel(false)}
          contentClassName="pt-2"
        >
          <StreamChatMutedViewerPanel
            mutedViewers={mutedViewers}
            isRefreshing={isRefreshingMutedViewers}
            onUnmute={handleUnmuteViewer}
          />
        </BottomSheet>
      )}
      {desktopMenu}
    </div>
  );
}
