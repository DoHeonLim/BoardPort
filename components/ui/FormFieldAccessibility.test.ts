/**
 * File Name : components/ui/FormFieldAccessibility.test.ts
 * Description : 공용 Input·Select·TagInput 접근성 연결 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   label·필드·오류·보조 설명 ID 연결과 숨김 label 검증
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useForm } from "react-hook-form";
import Input from "./Input";
import Select from "./Select";
import TagInput from "./TagInput";

type TagFormValues = { tags: string[] };

/** 실제 react-hook-form control을 주입한 태그 입력 테스트 fixture */
function TagInputFixture() {
  const { control } = useForm<TagFormValues>({
    defaultValues: { tags: [] },
  });

  return createElement(TagInput<TagFormValues>, {
    name: "tags",
    control,
  });
}

/** 렌더링된 HTML에서 지정한 ARIA 속성 값을 추출 */
function getAttribute(html: string, attribute: string): string {
  const match = html.match(new RegExp(`${attribute}="([^"]+)"`));
  if (!match) throw new Error(`${attribute} 속성을 찾을 수 없습니다.`);
  return match[1];
}

describe("common form field accessibility", () => {
  it("Input label과 오류 메시지를 실제 필드 ID에 연결한다", () => {
    const html = renderToStaticMarkup(
      createElement(Input, {
        name: "email",
        label: "이메일 주소",
        errors: ["이메일을 입력해 주세요."],
        "aria-describedby": "email-help",
      })
    );
    const inputId = getAttribute(html, "id");
    const errorId = getAttribute(html, "aria-errormessage");

    expect(html).toContain(`for="${inputId}"`);
    expect(html).toContain(`id="${errorId}"`);
    expect(html).toContain(`aria-describedby="email-help ${errorId}"`);
    expect(html).toContain('aria-invalid="true"');
  });

  it("숨김 label도 접근 가능한 이름으로 필드에 연결한다", () => {
    const html = renderToStaticMarkup(
      createElement(Input, {
        name: "password",
        label: "비밀번호",
        hideLabel: true,
        type: "password",
      })
    );
    const inputId = getAttribute(html, "id");

    expect(html).toContain(`for="${inputId}"`);
    expect(html).toContain("sr-only");
    expect(html).toContain(">비밀번호</label>");
  });

  it("Select의 기존 보조 설명과 검증 오류 ID를 함께 유지한다", () => {
    const html = renderToStaticMarkup(
      createElement(
        Select,
        {
          name: "condition",
          label: "상품 상태",
          errors: ["상품 상태를 선택해 주세요."],
          "aria-describedby": "condition-help",
        },
        createElement("option", { value: "" }, "선택")
      )
    );
    const selectId = getAttribute(html, "id");
    const errorId = getAttribute(html, "aria-errormessage");

    expect(html).toContain(`for="${selectId}"`);
    expect(html).toContain(`id="${errorId}"`);
    expect(html).toContain(`aria-describedby="condition-help ${errorId}"`);
  });

  it("TagInput label을 실제 태그 입력 필드에 연결한다", () => {
    const html = renderToStaticMarkup(createElement(TagInputFixture));
    const inputId = getAttribute(html, "id");

    expect(html).toContain(`for="${inputId}"`);
    expect(html).toContain("태그 (최대 5개)");
  });
});
