/**
 * File Name : features/post/components/postsDetail/PostDetailEmbed.tsx
 * Description : 게시글 상세용 유튜브 임베드 블록
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.14  임도헌   Created   유튜브 iframe을 썸네일 클릭 시점까지 지연해 상세 초기 서드파티 비용을 줄이는 전용 임베드 카드 추가
 * 2026.04.14  임도헌   Modified  LCP 후보가 되는 썸네일을 우선 로드하도록 옵션을 열고 버튼 접근성 이름을 시각 레이블과 정렬
 * 2026.04.14  임도헌   Modified  버튼의 안내 문구까지 접근성 이름에 포함해 Lighthouse 레이블 불일치 경고를 줄임
 * 2026.04.14  임도헌   Modified  버튼 안의 썸네일 이미지를 장식용으로 처리하고 자연 텍스트 이름을 사용해 접근성 이름 계산을 단순화
 */
"use client";

import { useState } from "react";
import Image from "next/image";
import { LinkIcon, PlayCircleIcon } from "@heroicons/react/24/outline";

interface PostDetailEmbedProps {
  title: string;
  embedUrl: string;
  thumbnailUrl?: string | null;
  isPriority?: boolean;
  sizes?: string;
}

/**
 * 유튜브 임베드는 실제 재생 의도가 생길 때까지 iframe 대신 썸네일 카드로 유지
 * 클릭 전까지는 제3자 스크립트/쿠키/플레이어 초기화를 막아 상세 첫 진입 비용을 눌러둔다.
 */
export default function PostDetailEmbed({
  title,
  embedUrl,
  thumbnailUrl,
  isPriority = false,
  sizes = "(max-width: 640px) calc(100vw - 32px), 640px",
}: PostDetailEmbedProps) {
  const [shouldLoadPlayer, setShouldLoadPlayer] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light">
          <LinkIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">{title}</p>
        </div>
      </div>

      {shouldLoadPlayer ? (
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShouldLoadPlayer(true)}
          className="focus-ring-strong-inset group relative block aspect-video w-full overflow-hidden rounded-2xl bg-black text-left"
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              sizes={sizes}
              priority={isPriority}
              fetchPriority={isPriority ? "high" : "auto"}
              loading={isPriority ? "eager" : "lazy"}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),linear-gradient(135deg,#0f172a,#111827)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/92 text-brand shadow-xl transition-transform duration-300 group-hover:scale-105 dark:bg-slate-950/92 dark:text-brand-light">
              <PlayCircleIcon className="size-9" />
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-4 text-white">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{title}</p>
              <p className="mt-1 text-xs text-white/75">
                재생할 때만 플레이어를 불러옵니다.
              </p>
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
              재생
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
