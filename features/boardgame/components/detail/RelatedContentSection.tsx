/**
 * File Name : features/boardgame/components/detail/RelatedContentSection.tsx
 * Description : 보드게임 상세 관련 콘텐츠 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   상품/게시글/방송 관련 콘텐츠 UI 분리
 */

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { BoardGameRelatedContent } from "@/features/boardgame/types/public";

interface RelatedContentSectionProps {
  content: BoardGameRelatedContent | null;
  searchKeyword: string;
}

/**
 * 보드게임과 직접 연결된 BoardPort 콘텐츠 표시
 * 연결 데이터가 없을 때 기존 키워드 검색으로 이어지는 보조 액션 유지
 *
 * @param props - 관련 콘텐츠 묶음과 검색 fallback 키워드
 * @returns 보드게임 상세 하단 관련 콘텐츠 섹션
 */
export default function RelatedContentSection({
  content,
  searchKeyword,
}: RelatedContentSectionProps) {
  const hasContent =
    !!content &&
    (content.products.length ||
      content.posts.length ||
      content.broadcasts.length);

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-primary">관련 콘텐츠</h2>
          <p className="mt-1 text-sm text-muted">
            이 보드게임과 연결된 상품, 게시글, 방송입니다.
          </p>
        </div>
        <Link
          href={`/products?keyword=${encodeURIComponent(searchKeyword)}`}
          className="focus-ring-soft shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-bold text-primary transition hover:bg-surface-dim"
        >
          항구에서 검색
        </Link>
      </div>

      {hasContent && content ? (
        <div className="mt-4 space-y-4">
          <RelatedProductList products={content.products} />
          <RelatedPostList posts={content.posts} />
          <RelatedBroadcastList broadcasts={content.broadcasts} />
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-surface-dim px-4 py-3 text-sm text-muted">
          아직 연결된 콘텐츠가 없습니다. 상품, 게시글, 방송 작성 시 이
          보드게임을 연결하면 여기에 표시됩니다.
        </p>
      )}
    </section>
  );
}

/**
 * 보드게임 연결 상품 목록 표시
 *
 * @param props - 관련 상품 목록
 * @returns 관련 상품 그룹 또는 null
 */
function RelatedProductList({
  products,
}: {
  products: BoardGameRelatedContent["products"];
}) {
  if (!products.length) return null;

  return (
    <RelatedContentGroup title="상품">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/products/view/${product.id}`}
          className="focus-ring-soft flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-dim p-2.5 transition hover:border-brand/50 hover:bg-surface"
        >
          <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={`${product.title} 상품 이미지`}
                width={64}
                height={64}
                sizes="48px"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] font-bold text-muted">
                이미지 없음
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">
              {product.title}
            </p>
            <p className="mt-1 text-xs font-bold text-brand">
              {product.price.toLocaleString()}원
            </p>
          </div>
        </Link>
      ))}
    </RelatedContentGroup>
  );
}

/**
 * 보드게임 연결 게시글 목록 표시
 *
 * @param props - 관련 게시글 목록
 * @returns 관련 게시글 그룹 또는 null
 */
function RelatedPostList({
  posts,
}: {
  posts: BoardGameRelatedContent["posts"];
}) {
  if (!posts.length) return null;

  return (
    <RelatedContentGroup title="게시글">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/posts/${post.id}`}
          className="focus-ring-soft block rounded-xl border border-border-subtle bg-surface-dim p-3 transition hover:border-brand/50 hover:bg-surface"
        >
          <p className="truncate text-sm font-bold text-primary">
            {post.title}
          </p>
          <p className="mt-1 text-xs text-muted">
            {post.category} · {post.createdAt.toLocaleDateString("ko-KR")}
          </p>
        </Link>
      ))}
    </RelatedContentGroup>
  );
}

/**
 * 보드게임 연결 방송 목록 표시
 *
 * @param props - 관련 방송 목록
 * @returns 관련 방송 그룹 또는 null
 */
function RelatedBroadcastList({
  broadcasts,
}: {
  broadcasts: BoardGameRelatedContent["broadcasts"];
}) {
  if (!broadcasts.length) return null;

  return (
    <RelatedContentGroup title="방송">
      {broadcasts.map((broadcast) => (
        <Link
          key={broadcast.id}
          href={`/streams/${broadcast.id}`}
          className="focus-ring-soft block rounded-xl border border-border-subtle bg-surface-dim p-3 transition hover:border-brand/50 hover:bg-surface"
        >
          <p className="truncate text-sm font-bold text-primary">
            {broadcast.title}
          </p>
          <p className="mt-1 text-xs text-muted">
            {getBroadcastStatusLabel(broadcast.status)}
            {broadcast.startedAt
              ? ` · ${broadcast.startedAt.toLocaleDateString("ko-KR")}`
              : ""}
          </p>
        </Link>
      ))}
    </RelatedContentGroup>
  );
}

/**
 * 관련 콘텐츠 하위 그룹의 제목과 목록 묶음 표시
 *
 * @param props - 그룹 제목과 children
 * @returns 관련 콘텐츠 그룹 UI
 */
function RelatedContentGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
        {title}
      </h3>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

/**
 * 방송 상태 enum 문자열을 사용자 표시 문구로 변환
 *
 * @param status - Broadcast status 문자열
 * @returns 한국어 상태 label
 */
function getBroadcastStatusLabel(status: string): string {
  switch (status) {
    case "CONNECTED":
      return "진행 중";
    case "ENDED":
      return "종료됨";
    case "DISCONNECTED":
      return "연결 끊김";
    default:
      return status;
  }
}
