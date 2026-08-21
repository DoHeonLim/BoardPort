/**
 * File Name : scripts/generate-e2e-stream-signing-key.test.ts
 * Description : GitHub E2E 임시 Stream signing key 생성 스크립트 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   GitHub 환경 파일용 2048-bit RSA JWK 생성 검증
 */

import { createPrivateKey } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateE2EStreamSigningKey } from "./generate-e2e-stream-signing-key.mjs";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("generate-e2e-stream-signing-key", () => {
  it("GitHub 환경 파일에 2048-bit RSA JWK를 기록한다", () => {
    const directory = mkdtempSync(join(tmpdir(), "boardport-e2e-key-"));
    temporaryDirectories.push(directory);
    const githubEnvPath = join(directory, "github-env");

    generateE2EStreamSigningKey(githubEnvPath);
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

    expect(values.CLOUDFLARE_STREAM_SIGNING_KEY_ID).toBe(
      "ci-e2e-signing-key"
    );
    expect(values.CLOUDFLARE_STREAM_SIGNING_KEY_JWK).toBeTruthy();

    const jwk = JSON.parse(
      Buffer.from(
        values.CLOUDFLARE_STREAM_SIGNING_KEY_JWK,
        "base64"
      ).toString("utf8")
    );
    const privateKey = createPrivateKey({ key: jwk, format: "jwk" });

    expect(privateKey.asymmetricKeyType).toBe("rsa");
    expect(privateKey.asymmetricKeyDetails?.modulusLength).toBe(2048);
  });
});
