/**
 * File Name : lib/cloudflareImages.ts
 * Description : Cloudflare 이미지 업로드용 URL 요청 함수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.12  임도헌   Created
 * 2025.06.12  임도헌   Modified  Cloudflare 이미지 업로드용 URL 요청 함수를 lib로 옮김
 * 2025.08.22  임도헌   Modified  DirectUploadURLResult 타입 도입 및 응답 표준화, 검증 로직 추가
 * 2026.01.16  임도헌   Renamed   lib/cloudflare/getUploadUrl -> lib/cloudflareImages.ts
 */
"use server";

type DirectUploadURLResult =
  | { success: true; result: { uploadURL: string; id: string } }
  | { success: false; error: string };

export async function getUploadUrl(): Promise<DirectUploadURLResult> {
  try {
    const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
    const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;

    if (!ACCOUNT_ID || !API_TOKEN) {
      return {
        success: false,
        error: "Cloudflare 환경변수가 설정되지 않았습니다.",
      };
    }

    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v2/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );

    const json = await resp.json();

    // 방어적 검증: 응답 포맷에 덜 의존하도록 최소 필드만 체크
    const ok =
      resp.ok &&
      json &&
      json.result &&
      typeof json.result.uploadURL === "string" &&
      typeof json.result.id === "string";

    if (!ok) {
      // 필요시 아래 로그를 임시로 열어 디버그
      // console.error("[getUploadUrl] Unexpected response:", json);
      return { success: false, error: "Cloudflare 업로드 URL 요청 실패" };
    }

    return {
      success: true,
      result: {
        uploadURL: json.result.uploadURL,
        id: json.result.id,
      },
    };
  } catch (e) {
    console.error("[getUploadUrl] Error:", e);
    return { success: false, error: "업로드 URL 생성 중 오류가 발생했습니다." };
  }
}
