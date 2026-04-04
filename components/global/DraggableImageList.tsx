/**
 * File Name : components/global/DraggableImageList.tsx
 * Description : 이미지 드래그 앤 드롭 컴포넌트 (시맨틱 토큰 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.10  임도헌   Created
 * 2024.12.10  임도헌   Modified  이미지 드래그 앤 드롭 컴포넌트 추가
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 스타일 개선
 * 2026.01.16  임도헌   Moved     components/image -> components/global
 * 2026.02.26  임도헌   Modified  이미지 업로드 X 버튼 크기 수정
 * 2026.04.04  임도헌   Modified  export/props 주석을 보강해 이미지 순서 편집 컴포넌트의 사용 의도를 명확히 정리
 */
import dynamic from "next/dynamic";
import type { DropResult } from "@hello-pangea/dnd";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { BLUR_DATA_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

// hello-pangea-dnd dynamic import
const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const Droppable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Droppable),
  { ssr: false }
);

const Draggable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Draggable),
  { ssr: false }
);

interface DraggableImageListProps {
  /** 현재 노출 중인 업로드 이미지 미리보기 URL 목록 */
  previews: string[];
  /** 특정 index 이미지를 목록에서 제거 */
  onDeleteImage: (index: number) => void;
  /** 드래그 종료 결과를 받아 상위에서 순서를 재정렬 */
  onDragEnd: (result: DropResult) => void;
}

/**
 * 업로드 이미지 미리보기 순서를 드래그로 재정렬하는 공용 리스트 컴포넌트
 *
 * - 이미지 미리보기 그리드 렌더링
 * - 드래그 기반 순서 변경
 * - 개별 이미지 삭제 버튼 제공
 *
 * @param {DraggableImageListProps} props - 미리보기 목록과 삭제/정렬 핸들러
 * @returns {JSX.Element} 드래그 가능한 이미지 리스트
 */
export default function DraggableImageList({
  previews,
  onDeleteImage,
  onDragEnd,
}: DraggableImageListProps) {
  return (
    <div className="mt-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="images" direction="horizontal">
          {(provided) => (
            <div
              className="grid grid-cols-3 gap-3"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {previews.map((preview, index) => (
                <Draggable
                  key={`draggable-${index}`}
                  draggableId={`draggable-${index}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden ring-1 ring-border bg-surface",
                        snapshot.isDragging &&
                          "opacity-50 ring-brand ring-2 z-50 shadow-xl"
                      )}
                    >
                      <div className="relative w-full h-full">
                        <Image
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={index === 0}
                          loading={index === 0 ? undefined : "lazy"}
                          placeholder="blur"
                          blurDataURL={BLUR_DATA_URL}
                        />
                      </div>

                      {/* Index Badge */}
                      <div className="absolute top-2 left-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-[10px] font-bold z-10 pointer-events-none">
                        {index + 1}
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onDeleteImage(index);
                        }}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 hover:bg-red-500 text-white transition-colors backdrop-blur-sm z-10"
                        aria-label="이미지 삭제"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
