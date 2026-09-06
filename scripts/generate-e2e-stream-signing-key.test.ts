/**
 * File Name : scripts/generate-e2e-stream-signing-key.test.ts
 * Description : GitHub CI/E2E 임시 Stream·Web Push signing key 생성 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   GitHub 환경 파일용 2048-bit RSA JWK 생성 검증
 * 2026.08.28  임도헌   Modified  통합 키 생성 함수명 반영 및 P-256 VAPID 공개키·개인키 형식 검증 추가
 */

import { createPrivateKey } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateCiSigningKeys } from "./generate-e2e-stream-signing-key.mjs";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("generate-e2e-stream-signing-key", () => {
  it("GitHub 환경 파일에 RSA JWK와 P-256 VAPID key pair를 기록한다", () => {
    const directory = mkdtempSync(join(tmpdir(), "boardport-e2e-key-"));
    temporaryDirectories.push(directory);
    const githubEnvPath = join(directory, "github-env");

    generateCiSigningKeys(githubEnvPath);
    const values = Object.fromEntries(
      readFileSync(githubEnvPath, "utf8")
        .trim()
        .split("\n")
        .map((line) => {
          const separatorIndex = line.indexOf("=");
          return [
            line.slice(0, separatorIndex),
            line.slice(separatorIndex + 1),
          ];
        })
    );

    expect(values.CLOUDFLARE_STREAM_SIGNING_KEY_ID).toBe("ci-e2e-signing-key");
    expect(values.CLOUDFLARE_STREAM_SIGNING_KEY_JWK).toBeTruthy();

    const jwk = JSON.parse(
      Buffer.from(values.CLOUDFLARE_STREAM_SIGNING_KEY_JWK, "base64").toString(
        "utf8"
      )
    );
    const privateKey = createPrivateKey({ key: jwk, format: "jwk" });

    expect(privateKey.asymmetricKeyType).toBe("rsa");
    expect(privateKey.asymmetricKeyDetails?.modulusLength).toBe(2048);

    const vapidPublicKey = Buffer.from(
      values.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      "base64url"
    );
    const vapidPrivateKey = Buffer.from(values.VAPID_PRIVATE_KEY, "base64url");

    expect(vapidPublicKey).toHaveLength(65);
    expect(vapidPublicKey[0]).toBe(0x04);
    expect(vapidPrivateKey).toHaveLength(32);
  });
});
