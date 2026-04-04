/**
 * File Name : features/search/components/SearchModal.tsx
 * Description : 모바일/PC 검색 모달 UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.21  임도헌   Created   검색 모달 UI 분리 (PC/모바일 공통)
 * 2026.01.11  임도헌   Modified  모바일 전체화면/데스크톱 드롭다운 분기 및 다크모드 적용
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.20  임도헌   Modified  타입 경로 수정 및 Import 정렬
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  Content에 overflow-y-auto 추가
 * 2026.02.27  임도헌   Modified  CreatePortal적용 및 커맨드 팔레트 UI 도입
 * 2026.03.08  임도헌   Modified  검색 모달의 기본 진입 애니메이션을 제거해 빠른 탐색 흐름에 맞는 정적인 인터랙션으로 조정
 * 2026.03.10  임도헌   Modified  모바일 검색 모달 내부 스크롤 안정화 및 iOS 터치 스크롤 대응
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 검색 모달/시트 중첩 상황에서도 스크롤 잠금 복구를 안정화
 * 2026.03.23  임도헌   Modified  구조 구분선 성격에 맞게 모달 셸과 헤더/푸터/분할선 보더를 subtle 기준으로 정리
 * 2026.04.02  임도헌   Modified  검색 기록/인기 검색 타입 import를 search 도메인 공용 타입 기준으로 정리
 */
"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/features/search/components/SearchBar";
import SearchHistoryBox from "@/features/search/components/SearchHistoryBox";
import PopularSearchesBox from "@/features/search/components/PopularSearchesBox";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type {
  SearchHistoryItem,
  PopularSearchItem,
} from "@/features/search/types";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

interface SearchModalProps {
  isOpen: boolean;
  isMobile: boolean;
  keyword: string | undefined;
  basePath: string;
  searchHistory: SearchHistoryItem[];
  popularSearches: PopularSearchItem[];
  onSearch: (keyword: string) => void;
  onClose: () => void;
  onRemoveHistory: (keyword: string) => void;
  onClearHistory: () => void;
}

/**
 * 검색 모달 컴포넌트
 *
 * [반응형 레이아웃]
 * - createPortal을 사용하여 부모 헤더의 backdrop-filter로 인한 CSS fixed 깨짐 현상(Stacking Context) 해결
 * - Mobile: 전체 화면(`fixed inset-0`)을 덮는 오버레이 형태
 * - Desktop: 검색바 하단에 부착되는 드롭다운(`absolute`) 형태
 *
 * [기능]
 * - 검색어 입력 (`SearchBar`)
 * - 최근 검색어 목록 및 관리 (`SearchHistoryBox`)
 * - 인기 검색어 목록 (`PopularSearchesBox`)
 */
export default function SearchModal({
  isOpen,
  isMobile,
  keyword,
  basePath,
  searchHistory,
  popularSearches,
  onSearch,
  onClose,
  onRemoveHistory,
  onClearHistory,
}: SearchModalProps) {
  const [mounted, setMounted] = useState(false);

  // SSR 방지 및 Portal 마운트 제어
  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 오픈 시 바디 스크롤 잠금 및 ESC 키 닫기 연동
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const value = keyword ?? "";

  // [Mobile Layout] Full Screen Fixed
  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border-subtle bg-background p-4 shrink-0">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-muted hover:text-primary transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
          <SearchBar onSearch={onSearch} value={value} autoFocus />
        </div>

        {/* Content */}
        <div
          className="bg-background flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="p-4 flex flex-col gap-8 pb-20">
            <SearchHistoryBox
              history={searchHistory}
              onSearch={onSearch}
              onRemove={onRemoveHistory}
              onClear={onClearHistory}
              basePath={basePath}
              isMobile
            />
            <div className="border-t border-border-subtle" />
            <PopularSearchesBox
              popularSearches={popularSearches}
              onSearch={onSearch}
              basePath={basePath}
            />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // [Desktop Layout] Command Palette Style (중앙 상단 모달)
  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-center pt-24 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="relative flex h-fit max-h-[75vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
      >
        {/* Search Input Area */}
        <div className="shrink-0 border-b border-border-subtle bg-surface p-6">
          <SearchBar onSearch={onSearch} value={value} className="mx-0" />
        </div>

        {/* History & Popular Area */}
        <div className="p-6 flex-1 overflow-y-auto bg-surface-dim/30">
          <div className="grid grid-cols-2 gap-8">
            <SearchHistoryBox
              history={searchHistory}
              onSearch={onSearch}
              onRemove={onRemoveHistory}
              onClear={onClearHistory}
              basePath={basePath}
            />
            <div className="border-l border-border-subtle pl-8">
              <PopularSearchesBox
                popularSearches={popularSearches}
                onSearch={onSearch}
                basePath={basePath}
              />
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="flex justify-end border-t border-border-subtle bg-surface p-4 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-muted hover:text-primary hover:bg-surface-dim rounded-xl transition-colors"
          >
            <XMarkIcon className="size-4 stroke-2" /> 닫기 (ESC)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
