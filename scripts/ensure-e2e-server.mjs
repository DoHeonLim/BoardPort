/**
 * File Name : scripts/ensure-e2e-server.mjs
 * Description : Playwright 실행 전 로컬 개발 서버 준비 여부 확인
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   E2E 실행 전 dev server 미실행 상태를 명확한 안내로 차단
 */

// 기본은 로컬 E2E dev server를 보지만, 필요하면 다른 preview URL로도 검증할 수 있다.
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

try {
  const response = await fetch(baseUrl, { method: "HEAD" });

  if (response.status >= 500) {
    throw new Error(`Unexpected server status: ${response.status}`);
  }
} catch {
  console.error("");
  console.error("[E2E] 로컬 개발 서버에 연결할 수 없습니다.");
  console.error("");
  console.error("Playwright E2E는 실행 중인 BoardPort 서버를 대상으로 검증합니다.");
  console.error("아래 순서로 실행해주세요.");
  console.error("");
  console.error("1. 터미널 1에서 서버 실행");
  console.error("   npm run dev:e2e");
  console.error("");
  console.error("2. 터미널 2에서 E2E 실행");
  console.error("   npm run test:e2e -- --project=chromium");
  console.error("");
  console.error("seed 기반 테스트까지 실행할 때는 tests/e2e/README.md 기준으로");
  console.error("아래 순서를 함께 사용합니다.");
  console.error("");
  console.error("   npm run seed:e2e");
  console.error('   $env:E2E_SEEDED="1"');
  console.error("   npm run test:e2e -- --project=chromium");
  console.error("   Remove-Item Env:E2E_SEEDED");
  console.error("   npm run cleanup:e2e");
  console.error("");
  process.exit(1);
}
