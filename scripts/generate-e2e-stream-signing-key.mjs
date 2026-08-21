/**
 * File Name : scripts/generate-e2e-stream-signing-key.mjs
 * Description : GitHub E2E용 임시 Cloudflare Stream RSA signing key 생성
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   Production JWK 없이 VOD 상세 token 발급 경로를 검증하도록 추가
 */

import { appendFileSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function generateE2EStreamSigningKey(githubEnvPath) {
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

  appendFileSync(
    githubEnvPath,
    [
      "CLOUDFLARE_STREAM_SIGNING_KEY_ID=ci-e2e-signing-key",
      `CLOUDFLARE_STREAM_SIGNING_KEY_JWK=${encodedPrivateJwk}`,
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 }
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  generateE2EStreamSigningKey(process.env.GITHUB_ENV);
  console.log("Generated an ephemeral RSA signing key for the E2E server.");
}
