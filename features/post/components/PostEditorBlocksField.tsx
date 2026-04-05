/**
 * File Name : features/post/components/PostEditorBlocksField.tsx
 * Description : 게시글 작성/수정 폼에서 사용하는 블록 에디터 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.31  임도헌   Created   PostForm에서 블록 목록/드래그/미디어 블록 렌더링 분리
 * 2026.03.31  임도헌   Modified  액션 바, VIDEO/IMAGE 블록 fallback 렌더링 문맥에 맞춰 주석 보강
 */
"use client";

import Image from "next/image";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Bars3Icon,
  FilmIcon,
  PhotoIcon,
  PlusIcon,
  PlayCircleIcon,
  LinkIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { ChangeEvent, DragEvent, MutableRefObject } from "react";
import type { PostEditorBlock, PostVideo } from "@/features/post/types";
import type { ImageBlockAsset } from "@/features/post/utils/editor";

interface PostEditorBlocksFieldProps {
  editorBlocks: PostEditorBlock[];
  imageBlockAssets: Record<string, ImageBlockAsset>;
  blockRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  imageInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  videoState: PostVideo | null;
  videoFileName: string | null;
  maxImages: number;
  isUploading: boolean;
  isVideoUploading: boolean;
  hasVideoBlock: boolean;
  isEditorLocked: boolean;
  descriptionError?: string;
  onAddTextBlock: () => void;
  onAddImageBlock: () => void;
  onAddVideoBlock: () => void;
  onAddEmbedBlock: () => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onRemoveBlock: (index: number) => void;
  onUpdateTextBlock: (id: string, value: string) => void;
  onUpdateEmbedBlock: (id: string, value: string) => void;
  onDragEnd: (result: DropResult) => void;
  onVideoDrop: (event: DragEvent<HTMLDivElement | HTMLButtonElement>) => Promise<void>;
  onVideoChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onClearVideo: () => void;
  onImageBlockDrop: (
    blockId: string,
    event: DragEvent<HTMLDivElement | HTMLButtonElement>
  ) => void;
  onImageBlockChange: (
    blockId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onRemoveImageBlockAsset: (blockId: string) => void;
}

/**
 * 게시글 본문 블록 목록을 렌더링합니다.
 * 버튼 정렬과 드래그 정렬을 동시에 제공해 모바일/데스크톱 모두에서 안전하게 사용할 수 있습니다.
 */
export default function PostEditorBlocksField({
  editorBlocks,
  imageBlockAssets,
  blockRefs,
  imageInputRefs,
  videoState,
  videoFileName,
  maxImages,
  isUploading,
  isVideoUploading,
  hasVideoBlock,
  isEditorLocked,
  descriptionError,
  onAddTextBlock,
  onAddImageBlock,
  onAddVideoBlock,
  onAddEmbedBlock,
  onMoveBlock,
  onRemoveBlock,
  onUpdateTextBlock,
  onUpdateEmbedBlock,
  onDragEnd,
  onVideoDrop,
  onVideoChange,
  onClearVideo,
  onImageBlockDrop,
  onImageBlockChange,
  onRemoveImageBlockAsset,
}: PostEditorBlocksFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* 블록 추가 액션 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-sm font-medium text-primary">본문 블록</label>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onAddTextBlock}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs font-medium text-primary transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1.5"
            disabled={isEditorLocked}
          >
            <PlusIcon className="size-3.5" />
            <span className="sm:hidden">텍스트</span>
            <span className="hidden sm:inline">텍스트 블록 추가</span>
          </button>
          <button
            type="button"
            onClick={onAddImageBlock}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs font-medium text-primary transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1.5"
            disabled={isEditorLocked}
          >
            <PlusIcon className="size-3.5" />
            <span className="sm:hidden">이미지</span>
            <span className="hidden sm:inline">이미지 블록 추가</span>
          </button>
          <button
            type="button"
            onClick={onAddVideoBlock}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs font-medium text-primary transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1.5"
            disabled={hasVideoBlock || isEditorLocked}
          >
            <PlusIcon className="size-3.5" />
            <span className="sm:hidden">동영상</span>
            <span className="hidden sm:inline">동영상 블록 추가</span>
          </button>
          <button
            type="button"
            onClick={onAddEmbedBlock}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs font-medium text-primary transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1.5"
            disabled={isEditorLocked}
          >
            <PlusIcon className="size-3.5" />
            <span className="sm:hidden">유튜브</span>
            <span className="hidden sm:inline">유튜브 블록 추가</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="post-editor-blocks">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-col gap-3"
            >
              {editorBlocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={(element) => {
                        dragProvided.innerRef(element);
                        blockRefs.current[block.id] = element;
                      }}
                      {...dragProvided.draggableProps}
                      className={`rounded-2xl border border-border bg-surface p-3.5 shadow-sm transition-shadow sm:p-4 ${
                        snapshot.isDragging ? "shadow-lg ring-2 ring-brand/20" : ""
                      }`}
                    >
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <button
                            type="button"
                            {...dragProvided.dragHandleProps}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`${index + 1}번째 블록 드래그`}
                            disabled={isEditorLocked}
                          >
                            <Bars3Icon className="size-4" />
                          </button>
                          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand dark:bg-brand-light/10 dark:text-brand-light">
                            {block.type === "TEXT"
                              ? "텍스트"
                              : block.type === "VIDEO"
                                ? "동영상"
                                : block.type === "EMBED"
                                  ? "유튜브"
                                  : "이미지"}
                          </span>
                          <span className="truncate text-[11px] text-muted sm:text-xs">
                            {index + 1}번째 블록
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => onMoveBlock(index, -1)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:opacity-40"
                            disabled={index === 0 || isEditorLocked}
                            aria-label="위로 이동"
                          >
                            <ArrowUpIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveBlock(index, 1)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:opacity-40"
                            disabled={index === editorBlocks.length - 1 || isEditorLocked}
                            aria-label="아래로 이동"
                          >
                            <ArrowDownIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveBlock(index)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-dim hover:text-danger"
                            aria-label="블록 제거"
                            disabled={isEditorLocked}
                          >
                            <XMarkIcon className="size-4" />
                          </button>
                        </div>
                      </div>

                      {block.type === "TEXT" ? (
                        <textarea
                          value={block.textContent ?? ""}
                          onChange={(event) =>
                            onUpdateTextBlock(block.id, event.target.value)
                          }
                          placeholder="내용을 입력해주세요"
                          disabled={isEditorLocked}
                          className="min-h-[140px] w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-base leading-relaxed text-primary outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15 dark:focus:border-brand-light dark:focus:ring-brand-light/15 sm:min-h-[180px]"
                        />
                      ) : block.type === "VIDEO" ? (
                        // VIDEO 블록 상태 분기
                        // draft가 있으면 상태 카드, 없으면 이 위치 전용 업로드 슬롯 노출
                        videoState ? (
                          <div className="rounded-xl border border-border bg-background">
                            <div className="flex items-start justify-between gap-4 px-4 py-4">
                              <div className="flex items-start gap-3">
                                <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light">
                                  {videoState.status === "READY" ? (
                                    <PlayCircleIcon className="size-5" />
                                  ) : (
                                    <FilmIcon className="size-5" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-primary">
                                    {videoFileName ?? "첨부 동영상"}
                                  </p>
                                  <p className="text-xs text-muted">
                                    {videoState.status === "READY"
                                      ? "재생 가능한 상태입니다."
                                      : videoState.status === "FAILED"
                                        ? "처리에 실패했습니다. 다시 업로드해주세요."
                                        : "Cloudflare에서 동영상을 처리하고 있습니다."}
                                  </p>
                                  <p className="text-[11px] text-muted">
                                    큰 영상 플랫폼이 아닌 게시글 보조 첨부 기준으로 짧은 클립만 허용합니다.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={onClearVideo}
                                className="rounded-lg p-1 text-muted transition-colors hover:text-danger"
                                disabled={isVideoUploading || isUploading || isEditorLocked}
                                aria-label="첨부 동영상 제거"
                              >
                                <XMarkIcon className="size-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={(event) => {
                              // 제출 중에도 브라우저 기본 파일 열기 방지
                              event.preventDefault();
                              if (isUploading || isVideoUploading) return;
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (isEditorLocked) return;
                              onVideoDrop(event);
                            }}
                            className="rounded-xl border border-dashed border-border bg-surface-dim/30"
                          >
                            <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 px-4 text-center transition-colors hover:border-brand/30 hover:bg-surface-dim sm:min-h-[180px]">
                              <FilmIcon className="size-6 text-brand" />
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-primary">
                                  이 위치에 동영상 첨부
                                </p>
                                <p className="text-xs text-muted">
                                  mp4, mov, webm / 최대 80MB / 최대 60초
                                </p>
                              </div>
                                <input
                                  type="file"
                                  accept="video/mp4,video/quicktime,video/webm"
                                  className="hidden"
                                  onChange={onVideoChange}
                                  disabled={isVideoUploading || isUploading || isEditorLocked}
                                />
                              </label>
                            </div>
                        )
                      ) : block.type === "EMBED" ? (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-border bg-background px-4 py-4">
                            <div className="mb-3 flex items-center gap-2 text-xs text-muted">
                              <LinkIcon className="size-4 text-brand" />
                              <span>유튜브 링크만 지원합니다.</span>
                            </div>
                            <input
                              type="url"
                              value={block.embedUrl ?? ""}
                              onChange={(event) =>
                                onUpdateEmbedBlock(block.id, event.target.value)
                              }
                              placeholder="https://www.youtube.com/watch?v=..."
                              disabled={isEditorLocked}
                              className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-primary outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15 dark:focus:border-brand-light dark:focus:ring-brand-light/15"
                            />
                            <p className="mt-2 text-xs text-muted">
                              watch, youtu.be, shorts 링크를 붙여넣으면 저장 시 임베드로 변환됩니다.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {imageBlockAssets[block.id] ? (
                            <div
                              className="overflow-hidden rounded-xl border border-border bg-background"
                              onDragOver={(event) => {
                                // 제출 중에도 브라우저 기본 파일 열기 방지
                                event.preventDefault();
                                if (isEditorLocked) return;
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (isEditorLocked) return;
                                onImageBlockDrop(block.id, event);
                              }}
                            >
                              <div className="relative h-56 w-full">
                                <Image
                                  src={imageBlockAssets[block.id]!.preview}
                                  alt={`${index + 1}번째 이미지 블록`}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                                <div className="flex items-center gap-2 text-xs text-muted">
                                  <PhotoIcon className="size-4 text-brand" />
                                  <span>
                                    {imageBlockAssets[block.id]!.isAnimated
                                      ? "GIF 이미지"
                                      : "정적 이미지"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                  onClick={() =>
                                    imageInputRefs.current[block.id]?.click()
                                  }
                                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-surface-dim"
                                  disabled={isEditorLocked}
                                >
                                  이미지 교체
                                </button>
                                  <button
                                    type="button"
                                  onClick={() =>
                                    onRemoveImageBlockAsset(block.id)
                                  }
                                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-danger hover:bg-surface-dim"
                                  disabled={isEditorLocked}
                                >
                                  이미지 비우기
                                </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                imageInputRefs.current[block.id]?.click()
                              }
                              onDragOver={(event) => {
                                // 제출 중에도 브라우저 기본 파일 열기 방지
                                event.preventDefault();
                                if (isEditorLocked) return;
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (isEditorLocked) return;
                                onImageBlockDrop(block.id, event);
                              }}
                              className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-dim/30 px-4 text-center transition-colors hover:border-brand/30 hover:bg-surface-dim sm:min-h-[180px]"
                            >
                              <PhotoIcon className="size-6 text-brand" />
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-primary">
                                  이 위치에 이미지 첨부
                                </p>
                                <p className="text-xs text-muted">
                                  jpg, png, webp, gif / 최대 10MB / 게시글당 {maxImages}장
                                </p>
                              </div>
                            </button>
                          )}

                          <input
                            ref={(element) => {
                              imageInputRefs.current[block.id] = element;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple
                            className="hidden"
                            onChange={(event) => onImageBlockChange(block.id, event)}
                            disabled={isEditorLocked}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {descriptionError && (
        <p className="pl-1 text-xs text-danger">{descriptionError}</p>
      )}
    </div>
  );
}
