/**
 * File Name : lib/media/ogText.ts
 * Description : 동적 OG 이미지용 로컬 글꼴 텍스트 렌더링
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.31  임도헌   Created   Vercel 런타임의 시스템 글꼴과 무관하게 Pretendard 한글 텍스트 합성
 * 2026.09.01  임도헌   Modified  서버 이미지 렌더러가 안정적으로 읽는 Pretendard OTF 글꼴로 전환
 * 2026.09.01  임도헌   Modified  공백 없는 긴 OG 제목도 카드 폭 안에서 줄바꿈하도록 공통 처리
 */

import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const PRETENDARD_BOLD_FONT_PATH = path.join(
  process.cwd(),
  "app",
  "fonts",
  "Pretendard-Bold.otf"
);

export type OgTextSpec = {
  text: string;
  x: number;
  baseline: number;
  fontSize: number;
  color: string;
  anchor?: "start" | "middle" | "end";
};

export type OgCard = {
  svg: string;
  texts: OgTextSpec[];
};

/**
 * 고정 폭 OG 카드에서 공백 유무와 관계없이 지정한 문자 수와 줄 수로 텍스트 분리
 *
 * @param value - 카드에 표시할 원문
 * @param maxChars - 한 줄에 허용할 최대 문자 수
 * @param maxLines - 표시할 최대 줄 수
 * @param fallback - 내용이 비었을 때 표시할 기본 문구
 * @returns 카드 폭에 맞춰 나뉜 텍스트 줄
 */
export function splitOgTextLines(
  value: string,
  maxChars: number,
  maxLines: number,
  fallback: string
) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return [fallback];

  const characters = Array.from(normalized);
  const lines: string[] = [];
  let cursor = 0;

  while (cursor < characters.length && lines.length < maxLines) {
    let end = Math.min(cursor + maxChars, characters.length);

    if (end < characters.length) {
      const lastSpace = characters.slice(cursor, end).lastIndexOf(" ");
      if (lastSpace > 0) end = cursor + lastSpace;
    }

    lines.push(characters.slice(cursor, end).join("").trim());
    cursor = end;
    while (characters[cursor] === " ") cursor += 1;
  }

  if (cursor < characters.length && lines.length) {
    const lastIndex = lines.length - 1;
    const visibleCharacters = Math.max(1, maxChars - 3);
    lines[lastIndex] = `${Array.from(lines[lastIndex])
      .slice(0, visibleCharacters)
      .join("")
      .trimEnd()}...`;
  }

  return lines;
}

/**
 * 사용자 문자열을 Pango markup 텍스트 노드에 안전하게 삽입
 */
function escapePangoText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 저장소의 Pretendard 글꼴로 OG 텍스트를 렌더링해 sharp 합성 레이어 생성
 *
 * @param spec - 텍스트, 기준선 좌표, 크기, 색상 및 정렬 기준
 * @returns PNG 텍스트 버퍼와 합성 위치
 */
async function createOgTextOverlay({
  text,
  x,
  baseline,
  fontSize,
  color,
  anchor = "start",
}: OgTextSpec): Promise<OverlayOptions> {
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${color}" size="${fontSize * 1024}" weight="bold">${escapePangoText(text)}</span>`,
      font: "Pretendard",
      fontfile: PRETENDARD_BOLD_FONT_PATH,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });

  const left =
    anchor === "middle"
      ? x - info.width / 2
      : anchor === "end"
        ? x - info.width
        : x;

  return {
    input: data,
    left: Math.max(0, Math.round(left)),
    top: Math.max(0, Math.round(baseline - info.height)),
  };
}

/**
 * 여러 OG 텍스트 사양을 병렬 렌더링해 sharp 합성 레이어 목록 생성
 *
 * @param specs - OG 카드에 표시할 텍스트 사양 목록
 * @returns 입력 순서를 유지한 sharp 합성 레이어 목록
 */
export function createOgTextOverlays(specs: OgTextSpec[]) {
  return Promise.all(specs.map(createOgTextOverlay));
}
