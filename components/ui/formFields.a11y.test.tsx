/**
 * File Name : components/ui/formFields.a11y.test.tsx
 * Description : 공용 폼 필드 접근성 연결 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.28  임도헌   Created   Input·textarea·Select·TagInput의 label과 오류 설명 연결 검증
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TagInput from "@/components/ui/TagInput";

type TagFormValues = { tags: string[] };

function TagInputWithError() {
  const { control, setError } = useForm<TagFormValues>({
    defaultValues: { tags: [] },
  });

  useEffect(() => {
    setError("tags", { message: "태그를 하나 이상 입력해주세요." });
  }, [setError]);

  return <TagInput name="tags" control={control} maxTags={3} />;
}

describe("공용 폼 필드 접근성", () => {
  it("Input label과 기존 도움말·검증 오류를 모두 입력에 연결한다", () => {
    render(
      <>
        <p id="email-help">계정에 사용할 이메일입니다.</p>
        <Input
          id="email"
          name="email"
          label="이메일"
          aria-describedby="email-help"
          errors={["이메일 형식이 올바르지 않습니다."]}
        />
      </>
    );

    const input = screen.getByRole("textbox", { name: "이메일" });
    const errorContainer = document.getElementById("email-error");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "email-help email-error");
    expect(input).toHaveAttribute("aria-errormessage", "email-error");
    expect(errorContainer).toHaveTextContent(
      "이메일 형식이 올바르지 않습니다."
    );
  });

  it("시각적으로 숨긴 textarea label도 접근 가능한 이름으로 유지한다", () => {
    render(
      <Input
        id="introduction"
        name="introduction"
        type="textarea"
        label="자기소개"
        hideLabel
      />
    );

    const textarea = screen.getByRole("textbox", { name: "자기소개" });
    expect(textarea).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByText("자기소개")).toHaveClass("sr-only");
  });

  it("Select label과 검증 오류를 실제 select 요소에 연결한다", () => {
    render(
      <Select
        id="region"
        name="region"
        label="활동 지역"
        errors={["지역을 선택해주세요."]}
      >
        <option value="">지역 선택</option>
        <option value="seoul">서울</option>
      </Select>
    );

    const select = screen.getByRole("combobox", { name: "활동 지역" });
    const errorContainer = document.getElementById("region-error");

    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-describedby", "region-error");
    expect(select).toHaveAttribute("aria-errormessage", "region-error");
    expect(errorContainer).toHaveTextContent("지역을 선택해주세요.");
  });

  it("TagInput의 동적 검증 오류를 태그 입력에 연결한다", () => {
    render(<TagInputWithError />);

    const input = screen.getByRole("textbox", { name: "태그 (최대 3개)" });
    const errorId = input.getAttribute("aria-errormessage");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(errorId).toBeTruthy();
    expect(input).toHaveAttribute("aria-describedby", errorId);
    expect(document.getElementById(errorId!)).toHaveTextContent(
      "태그를 하나 이상 입력해주세요."
    );
  });
});
