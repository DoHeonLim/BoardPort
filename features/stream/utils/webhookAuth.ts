/**
 * File Name : features/stream/utils/webhookAuth.ts
 * Description : Cloudflare Webhook 인증 정책 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.25  임도헌   Created   웹훅 secret 누락 시 production fail-closed 정책 분리
 */

export type CloudflareWebhookKind = "stream" | "destination";

/**
 * 운영 환경에서는 실제 상태 변경 웹훅에 필요한 secret이 비어 있으면 요청을 거부한다.
 *
 * @param params.kind - Stream signature 웹훅인지 Destination header 웹훅인지
 * @param params.streamSecret - Stream HMAC 검증용 secret
 * @param params.destinationSecret - Destination header 검증용 secret
 * @param params.nodeEnv - 현재 Node 환경
 * @returns production에서 해당 웹훅 secret이 필수인데 누락되었는지 여부
 */
export function isMissingRequiredCloudflareWebhookSecret({
  kind,
  streamSecret,
  destinationSecret,
  nodeEnv = process.env.NODE_ENV,
}: {
  kind: CloudflareWebhookKind;
  streamSecret: string;
  destinationSecret: string;
  nodeEnv?: string;
}) {
  if (nodeEnv !== "production") return false;

  return kind === "stream" ? !streamSecret : !destinationSecret;
}
