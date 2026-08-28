/**
 * File Name : scripts/generate-e2e-stream-signing-key.mjs
 * Description : GitHub CI/E2E용 임시 Stream·Web Push signing key 생성
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   Production JWK 없이 VOD 상세 token 발급 경로를 검증하도록 추가
 * 2026.08.28  임도헌   Modified  저장소에 VAPID private key를 두지 않도록 실행별 Web Push key 생성 추가
 */

import { appendFileSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** GitHub Actions의 후속 step에서 사용할 임시 Stream·VAPID key를 GITHUB_ENV에 기록한다. */
export function generateCiSigningKeys(githubEnvPath) {
  if (!githubEnvPath) {
    throw new Error("GITHUB_ENV is required to export the E2E signing key.");
  }

  // E2E VOD는 외부 Cloudflare 자산이 아닌 seed UID를 사용하므로 실제 계정에
  // 등록된 key가 필요하지 않다. 페이지의 fail-closed token 생성 경로만 재현한다.
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateJwk = privateKey.export({ format: "jwk" });
  const encodedPrivateJwk = Buffer.from(
    JSON.stringify(privateJwk),
    "utf8"
  ).toString("base64");

  // Web Push 설정도 실제 운영 key 대신 실행마다 P-256 key pair를 만들어
  // production build 경계를 검증하면서 저장소와 Git 이력에 private key를 남기지 않는다.
  const { privateKey: vapidPrivateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const vapidJwk = vapidPrivateKey.export({ format: "jwk" });
  if (!vapidJwk.x || !vapidJwk.y || !vapidJwk.d) {
    throw new Error("Failed to generate the E2E VAPID key pair.");
  }
  const vapidPublicKey = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(vapidJwk.x, "base64url"),
    Buffer.from(vapidJwk.y, "base64url"),
  ]).toString("base64url");

  appendFileSync(
    githubEnvPath,
    [
      "CLOUDFLARE_STREAM_SIGNING_KEY_ID=ci-e2e-signing-key",
      `CLOUDFLARE_STREAM_SIGNING_KEY_JWK=${encodedPrivateJwk}`,
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidPublicKey}`,
      `VAPID_PRIVATE_KEY=${vapidJwk.d}`,
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 }
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  generateCiSigningKeys(process.env.GITHUB_ENV);
  console.log("Generated ephemeral Stream and Web Push signing keys.");
}
