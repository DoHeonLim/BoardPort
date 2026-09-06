/**
 * File Name : components/global/ImageUploader.test.tsx
 * Description : 공용 이미지 업로더 키보드 파일 선택 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.05  임도헌   Created   업로드 슬롯 버튼과 파일 선택 연결 검증
 */

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImageUploader from "./ImageUploader";

describe("ImageUploader", () => {
  it("이미지 업로드 슬롯을 키보드로 활성화해 파일 선택을 연다", () => {
    const inputClick = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(
      <ImageUploader
        previews={[]}
        onImageChange={vi.fn()}
        onDeleteImage={vi.fn()}
        onDragEnd={vi.fn()}
        isOpen
        onToggle={vi.fn()}
      />
    );

    const uploadButton = screen.getByRole("button", {
      name: "클릭 또는 드래그하여 사진 추가",
    });

    uploadButton.focus();
    fireEvent.keyDown(uploadButton, { key: "Enter" });
    fireEvent.click(uploadButton);

    expect(uploadButton).toHaveFocus();
    expect(inputClick).toHaveBeenCalledOnce();

    inputClick.mockRestore();
  });
});
