/**
 * File Name : scripts/run-migration-test-docker.mjs
 * Description : 일회용 PostgreSQL Docker에서 migration 통합 테스트 실행
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   컨테이너 생성·준비 확인·테스트·정리를 단일 명령으로 자동화
 * 2026.09.03  임도헌   Modified  전체 도메인을 공통 target 인자로 선택 실행하도록 일반화
 * 2026.09.03  임도헌   Modified  실행 대상·준비 대기·환경변수 주입·정리 안전장치 설명 보강
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { migrationTestTargets } from "./migration-test-targets.mjs";

// 개별 migration 스크립트의 안전 검사와 동일한 localhost·전용 DB 이름 사용
// 개발용 PostgreSQL 기본 포트와 충돌하지 않도록 로컬 테스트 포트를 55432로 지정
const DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:55432/boardport_migration_test?schema=public";
// 동시 실행 프로세스 간 컨테이너 이름 충돌 방지를 위한 현재 PID 포함
const CONTAINER_NAME = `boardport-migration-test-${process.pid}`;
const READY_RETRY_COUNT = 30;

// target 생략 시 전체 실행, 지정 시 공통 목록에 등록된 단일 도메인만 실행
// 예: npm run test:migration:docker -- product-trade
const targetName = process.argv[2] ?? "all";
const target = migrationTestTargets.find(
  (candidate) => candidate.key === targetName
);

// 불필요한 외부 상태 생성을 막기 위해 잘못된 target을 Docker 생성 전에 거부
if (targetName !== "all" && !target) {
  throw new Error(
    `Unknown migration Docker test target: ${targetName}. Use one of: all, ${migrationTestTargets.map(({ key }) => key).join(", ")}.`
  );
}

/** PostgreSQL 준비 상태 재확인 사이의 비동기 대기 */
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

// 실제 생성에 성공한 컨테이너만 finally에서 종료하기 위한 소유권 플래그
let containerStarted = false;

try {
  // --rm 컨테이너 종료와 삭제를 함께 수행하기 위한 finally의 docker stop 사용
  const containerId = execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "--name",
      CONTAINER_NAME,
      "-e",
      "POSTGRES_USER=postgres",
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_DB=boardport_migration_test",
      "-p",
      "127.0.0.1:55432:5432",
      "postgres:16",
    ],
    { encoding: "utf8" }
  ).trim();
  containerStarted = true;
  console.log(`Migration test PostgreSQL started: ${containerId.slice(0, 12)}`);

  // 컨테이너 시작 이후 PostgreSQL 연결 가능 상태까지 최대 30초 확인
  let databaseReady = false;
  for (let attempt = 0; attempt < READY_RETRY_COUNT; attempt += 1) {
    try {
      execFileSync(
        "docker",
        [
          "exec",
          CONTAINER_NAME,
          "pg_isready",
          "-U",
          "postgres",
          "-d",
          "boardport_migration_test",
        ],
        { stdio: "ignore" }
      );
      databaseReady = true;
      break;
    } catch {
      await wait(1_000);
    }
  }

  if (!databaseReady) {
    throw new Error("Migration test PostgreSQL did not become ready in time.");
  }

  if (targetName === "all") {
    // 전체 실행기에 공통 URL을 주입한 뒤 각 도메인의 전용 환경변수로 전달
    console.log("Running all migration integration tests.");
    execFileSync(process.execPath, [resolve("scripts/test-migrations.mjs")], {
      cwd: process.cwd(),
      env: { ...process.env, MIGRATION_TEST_DATABASE_URL: DATABASE_URL },
      stdio: "inherit",
    });
  } else {
    // 단일 실행 시 선택한 도메인 스크립트가 요구하는 환경변수만 주입
    console.log(`Running migration integration test: ${target.name}`);
    execFileSync(process.execPath, [resolve("scripts", target.script)], {
      cwd: process.cwd(),
      env: { ...process.env, [target.envName]: DATABASE_URL },
      stdio: "inherit",
    });
  }
} finally {
  // 테스트 실패나 예외 발생 여부와 무관하게 이 프로세스가 생성한 PostgreSQL 정리
  if (containerStarted) {
    try {
      execFileSync("docker", ["stop", "--time", "5", CONTAINER_NAME], {
        stdio: "ignore",
      });
      console.log("Migration test PostgreSQL stopped and removed.");
    } catch (error) {
      console.error(
        "Failed to stop migration test PostgreSQL container.",
        error
      );
    }
  }
}
