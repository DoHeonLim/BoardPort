/**
 * File Name : components/image/DraggableImageList.tsx
 * Description : 이미지 드래그 앤 드롭 컴포넌트 (시맨틱 토큰 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.10  임도헌   Created
 * 2024.12.10  임도헌   Modified  이미지 드래그 앤 드롭 컴포넌트 추가
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 스타일 개선
 * 2026.01.16  임도헌   Moved     components/image -> components/global
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
  previews: string[];
  onDeleteImage: (index: number) => void;
  onDragEnd: (result: DropResult) => void;
}

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
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-red-500 text-white transition-colors backdrop-blur-sm z-10"
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
