/**
 * File Name : scripts/backfill-cloudflare-signed-playback.ts
 * Description : 기존 Cloudflare Live Input/VOD signed playback 정책 backfill
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   운영 DB 대상만 dry-run·적용·전수 검증하도록 추가
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const API_BASE = "https://api.cloudflare.com/client/v4";
const EXPECTED_LIVE_INPUT_COUNT = 5;
const EXPECTED_VOD_COUNT = 7;
const REQUEST_TIMEOUT_MS = 10_000;
const applyChanges = process.argv.includes("--apply");

type CloudflareEnvelope<T> = {
  success?: boolean;
  result?: T;
};

type LiveInputRecording = {
  allowedOrigins?: string[];
  hideLiveViewerCount?: boolean;
  mode?: "off" | "automatic";
  requireSignedURLs?: boolean;
  timeoutSeconds?: number;
};

type CloudflareLiveInput = {
  uid?: string;
  recording?: LiveInputRecording;
};

type CloudflareVod = {
  uid?: string;
  requireSignedURLs?: boolean;
};

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length)
      : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    const rawValue = normalized.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function createDb() {
  const rawConnectionString =
    process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!rawConnectionString) {
    throw new Error("DATABASE_URL or DIRECT_URL is required.");
  }

  const connectionUrl = new URL(rawConnectionString);
  connectionUrl.searchParams.delete("pgbouncer");
  connectionUrl.searchParams.delete("connection_limit");

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: connectionUrl.toString() }),
  });
}

function maskUid(uid: string) {
  return `${uid.slice(0, 6)}...${uid.slice(-4)}`;
}

function assertProviderUid(uid: string, label: string) {
  if (!/^[a-zA-Z0-9]{32}$/.test(uid)) {
    throw new Error(`${label} contains an invalid Cloudflare UID.`);
  }
}

async function readResponse<T>(response: Response, label: string) {
  let data: CloudflareEnvelope<T>;
  try {
    data = (await response.json()) as CloudflareEnvelope<T>;
  } catch {
    throw new Error(`${label} returned invalid JSON (${response.status}).`);
  }

  if (!response.ok || data.success !== true || !data.result) {
    throw new Error(`${label} failed (${response.status}).`);
  }
  return data.result;
}

function createCloudflareClient(accountId: string, apiToken: string) {
  async function request<T>(label: string, path: string, init?: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        cache: "no-store",
        signal: controller.signal,
      });
      return await readResponse<T>(response, label);
    } finally {
      clearTimeout(timeout);
    }
  }

  const accountPath = `/accounts/${encodeURIComponent(accountId)}/stream`;
  return {
    getLiveInput(uid: string) {
      return request<CloudflareLiveInput>(
        `GET Live Input ${maskUid(uid)}`,
        `${accountPath}/live_inputs/${encodeURIComponent(uid)}`
      );
    },
    updateLiveInput(uid: string, recording: LiveInputRecording) {
      // Cloudflare가 응답에 필드를 추가해도 PUT 본문에는 문서화된 recording
      // 설정만 넣어 기존 정책을 보존하고 알 수 없는 필드 전송은 피한다.
      const preservedRecording: LiveInputRecording = {
        allowedOrigins: recording.allowedOrigins,
        hideLiveViewerCount: recording.hideLiveViewerCount,
        mode: recording.mode,
        timeoutSeconds: recording.timeoutSeconds,
        requireSignedURLs: true,
      };

      return request<CloudflareLiveInput>(
        `PUT Live Input ${maskUid(uid)}`,
        `${accountPath}/live_inputs/${encodeURIComponent(uid)}`,
        {
          method: "PUT",
          body: JSON.stringify({ recording: preservedRecording }),
        }
      );
    },
    getVod(uid: string) {
      return request<CloudflareVod>(
        `GET VOD ${maskUid(uid)}`,
        `${accountPath}/${encodeURIComponent(uid)}`
      );
    },
    updateVod(uid: string) {
      return request<CloudflareVod>(
        `POST VOD ${maskUid(uid)}`,
        `${accountPath}/${encodeURIComponent(uid)}`,
        {
          method: "POST",
          body: JSON.stringify({ requireSignedURLs: true }),
        }
      );
    },
  };
}

async function main() {
  loadEnvFile();

  const accountId = requireEnvironment("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = requireEnvironment("CLOUDFLARE_API_TOKEN");
  const db = createDb();
  const cloudflare = createCloudflareClient(accountId, apiToken);

  try {
    const [liveInputs, vodAssets] = await Promise.all([
      db.liveInput.findMany({
        orderBy: { id: "asc" },
        select: { provider_uid: true },
      }),
      db.vodAsset.findMany({
        orderBy: { id: "asc" },
        select: { provider_asset_id: true },
      }),
    ]);

    if (liveInputs.length !== EXPECTED_LIVE_INPUT_COUNT) {
      throw new Error(
        `Expected ${EXPECTED_LIVE_INPUT_COUNT} Live Inputs, found ${liveInputs.length}.`
      );
    }
    if (vodAssets.length !== EXPECTED_VOD_COUNT) {
      throw new Error(
        `Expected ${EXPECTED_VOD_COUNT} VOD assets, found ${vodAssets.length}.`
      );
    }

    const liveUids = liveInputs.map((item) => item.provider_uid);
    const vodUids = vodAssets.map((item) => item.provider_asset_id);
    for (const uid of liveUids) assertProviderUid(uid, "LiveInput.provider_uid");
    for (const uid of vodUids) assertProviderUid(uid, "VodAsset.provider_asset_id");

    console.log(
      `[${applyChanges ? "APPLY" : "DRY-RUN"}] Live Inputs ${liveUids.length}, VOD ${vodUids.length}`
    );

    let liveChanged = 0;
    for (const uid of liveUids) {
      const current = await cloudflare.getLiveInput(uid);
      const signed = current.recording?.requireSignedURLs === true;
      console.log(`Live Input ${maskUid(uid)}: ${signed ? "already true" : "false -> true"}`);

      if (applyChanges && !signed) {
        await cloudflare.updateLiveInput(uid, current.recording ?? {});
        liveChanged += 1;
      }
    }

    let vodChanged = 0;
    for (const uid of vodUids) {
      const current = await cloudflare.getVod(uid);
      const signed = current.requireSignedURLs === true;
      console.log(`VOD ${maskUid(uid)}: ${signed ? "already true" : "false -> true"}`);

      if (applyChanges && !signed) {
        await cloudflare.updateVod(uid);
        vodChanged += 1;
      }
    }

    if (!applyChanges) {
      console.log("Dry-run complete. No Cloudflare resources were changed.");
      return;
    }

    const verifiedLiveInputs = await Promise.all(
      liveUids.map(async (uid) => ({
        uid,
        signed:
          (await cloudflare.getLiveInput(uid)).recording
            ?.requireSignedURLs === true,
      }))
    );
    const verifiedVods = await Promise.all(
      vodUids.map(async (uid) => ({
        uid,
        signed: (await cloudflare.getVod(uid)).requireSignedURLs === true,
      }))
    );

    const failedLiveInputs = verifiedLiveInputs.filter((item) => !item.signed);
    const failedVods = verifiedVods.filter((item) => !item.signed);
    if (failedLiveInputs.length > 0 || failedVods.length > 0) {
      throw new Error(
        `Verification failed: Live Inputs ${failedLiveInputs.length}, VOD ${failedVods.length}.`
      );
    }

    console.log(
      `Backfill verified: Live Inputs ${verifiedLiveInputs.length}/${liveUids.length}, VOD ${verifiedVods.length}/${vodUids.length}.`
    );
    console.log(`Changed: Live Inputs ${liveChanged}, VOD ${vodChanged}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Signed playback backfill failed: ${message}`);
  process.exitCode = 1;
});
