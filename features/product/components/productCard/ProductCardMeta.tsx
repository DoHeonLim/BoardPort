/**
 * File Name : features/product/components/productCard/ProductCardMeta.tsx
 * Description : 조회수, 좋아요, 위치, 기준 시점 등 제품 메타 정보 표시 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 메타 정보 분리
 * 2026.01.10  임도헌   Modified  아이콘과 텍스트를 text-muted로 통일
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.03  임도헌   Modified  끌어올리기(bumpCount) 표시 추가
 * 2026.02.15  임도헌   Modified  위치 정보(region) 표시 추가
 * 2026.02.26  임도헌   Modified  제품 리스트 카드 찌그러짐 수정 및 모달/모바일 레이아웃 보정
 * 2026.03.06  임도헌   Modified  모바일 그리드에서는 위치 정보 1줄을 노출하고 메타 배치를 압축형으로 조정
 * 2026.03.14  임도헌   Modified  그리드 카드에 작성 시간 노출 추가 (위치 있으면 같은 행 우측, 없으면 단독 행)
 * 2026.03.16  임도헌   Modified  리스트 카드에서 위치 유무와 관계없이 작성 시간을 우측 끝에 정렬
 * 2026.03.25  임도헌   Modified  리스트 카드 메타 줄의 간격과 구분선 강도를 날짜 우측 정렬 구조에 맞게 정리
 * 2026.03.26  임도헌   Modified  활동 시점(activityAt)과 라벨(activityLabel) 지원으로 프로필 찜 메타 의미를 명확화
 * 2026.03.26  임도헌   Modified  찜 목록에서는 활동 시점을 메타 그룹에 합쳐 액션 버튼과 정렬 충돌을 줄임
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 카드 메타 라벨 타이포 무게를 정리
 * 2026.04.17  임도헌   Modified  찜한 내역에서도 활동 시점(activityLabel + TimeAgo)이 장소 유무와 무관하게 우측 끝에 고정되도록 정렬 규칙 정리
 * 2026.05.04  임도헌   Modified  그리드 카드의 위치/시간/반응 메타를 한 줄로 압축
 * 2026.05.04  임도헌   Modified  그리드 카드 작성 시간을 우측 끝에 고정해 장소 유무와 무관한 정렬 유지
 * 2026.05.18  임도헌   Modified  좋아요 수가 아닌 현재 유저 좋아요 여부 기준으로 하트 색상 표시
 * 2026.05.20  임도헌   Modified  작성 시간 외 찜/끌어올림 기준 활동 시점 표시 의미를 주석에 반영
 * 2026.06.01  임도헌   Modified  모바일 리스트 카드의 장소/시간 메타를 통계 줄과 분리해 지역 가시성 보강
 * 2026.06.01  임도헌   Modified  그리드 카드 메타는 반응 지표와 시간 중심으로 압축해 탐색 밀도 정리
 * 2026.06.01  임도헌   Modified  리스트 카드 장소 유무에 따라 1줄/2줄 메타를 분기하고 공백 지역값을 정규화
 * 2026.06.04  임도헌   Modified  데모 상품 리스트에서 하단 메타가 잘리지 않도록 최소 높이 보강
 */

"use client";

import {
  EyeIcon,
  HeartIcon,
  ArrowUpIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import TimeAgo from "@/components/ui/TimeAgo";
import { cn } from "@/lib/utils";
import type { ISODate, ViewMode } from "@/features/product/types";

interface ProductCardMetaProps {
  views: number;
  likes: number;
  isLiked?: boolean;
  createdAt: ISODate;
  activityAt?: ISODate;
  activityLabel?: string;
  bumpCount?: number;
  region2?: string | null;
  region3?: string | null;
  viewMode?: ViewMode;
}

/**
 * 하단 메타 정보(좋아요 수, 조회수, 위치, 기준 시점)를 표시하는 컴포넌트
 *
 * [레이아웃 기준]
 * 1. 그리드 카드는 장소를 제외하고 반응 지표와 시간 중심으로 밀도 유지
 * 2. 리스트 카드는 통계 줄과 장소/시간 줄을 분리해 지역명 가시성 확보
 * 3. 기준 시점은 장소 유무와 관계없이 우측 끝 정렬
 * 4. 위치 정보는 공간 부족 시 말줄임 처리
 */
export default function ProductCardMeta({
  views,
  likes,
  isLiked = false,
  createdAt,
  activityAt,
  activityLabel,
  bumpCount = 0,
  region2,
  region3,
  viewMode = "list",
}: ProductCardMetaProps) {
  const effectiveDate = activityAt ?? createdAt;
  const dateValue = effectiveDate ? effectiveDate.toString() : "";
  // 동 단위까지만 표시 (예: "동작구 사당동")
  const locationText = [region2, region3]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const isGrid = viewMode === "grid";
  const timeMeta = dateValue ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {activityLabel && (
        <span className="text-xs font-normal text-muted/80">
          {activityLabel}
        </span>
      )}
      <TimeAgo
        date={dateValue}
        className="whitespace-nowrap shrink-0 text-muted"
        live={false}
      />
    </span>
  ) : null;

  if (isGrid) {
    return (
      <div className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden text-xs text-muted">
        {(bumpCount > 0 || likes >= 0 || views >= 0) && (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {bumpCount > 0 && (
              <div className="flex shrink-0 items-center gap-0.5 font-bold text-brand dark:text-brand-light">
                <ArrowUpIcon className="size-3" />
                <span>{bumpCount}</span>
              </div>
            )}
            <div className="flex shrink-0 items-center gap-0.5">
              <HeartIcon
                className={cn(
                  "size-3",
                  isLiked ? "text-rose-500" : "text-muted/70"
                )}
              />
              <span>{likes}</span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <EyeIcon className="size-3 text-muted/70" />
              <span>{views}</span>
            </div>
          </div>
        )}

        {timeMeta && (
          <div className="flex shrink-0 items-center gap-1 pl-1">
            {timeMeta}
          </div>
        )}
      </div>
    );
  }

  const statsMeta = (
    <>
      {bumpCount > 0 && (
        <div className="flex shrink-0 items-center gap-0.5 font-bold text-brand dark:text-brand-light">
          <ArrowUpIcon className="size-3" />
          <span>{bumpCount}</span>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          <HeartIcon
            className={cn(
              "size-3",
              isLiked ? "text-rose-500" : "text-muted/70"
            )}
          />
          <span>{likes}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <EyeIcon className="size-3 text-muted/70" />
          <span>{views}</span>
        </div>
      </div>
    </>
  );

  if (!locationText) {
    return (
      <div className="flex w-full min-w-0 items-end gap-1.5 overflow-hidden text-xs text-muted">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {statsMeta}
        </div>
        {timeMeta && (
          <div className="ml-auto flex shrink-0 items-center gap-1 pr-0.5 sm:pr-1">
            {timeMeta}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[2.75rem] w-full min-w-0 flex-col justify-end gap-1 overflow-hidden text-xs text-muted">
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {statsMeta}
      </div>

      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        <div
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden"
          title={locationText}
        >
          <MapPinIcon className="size-3 shrink-0 text-muted/80" />
          <span className="truncate">{locationText}</span>
        </div>
        {timeMeta && (
          <div className="ml-auto flex shrink-0 items-center gap-1 pr-0.5 sm:pr-1">
            {timeMeta}
          </div>
        )}
      </div>
    </div>
  );
}
