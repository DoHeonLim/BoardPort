# 프레임워크·의존성 보안 업그레이드 운영 기록

## 목적

BoardPort v1.3.0에서 오래된 프레임워크와 production 의존성을 갱신하면서 호환성 변경, PWA 전환, 남은 취약점의 처리 기준을 함께 기록한다.

기준일은 `2026-08-23`이며, 버전 판단은 [Next.js 16 업그레이드 가이드](https://nextjs.org/docs/app/guides/upgrading/version-16), [Next.js PWA 가이드](https://nextjs.org/docs/app/guides/progressive-web-apps), [Serwist Next.js 가이드](https://serwist.pages.dev/docs/next/getting-started)를 따른다.

## 적용 범위

- Next.js `14.2.26` → `16.3.2`
- React·React DOM `18.3.1` → `19.2.8`
- Prisma CLI·Client·adapter `7.0.1` → `7.9.1`
- Supabase JS, bcrypt, sharp, validator, ECharts, iron-session 등 직접 의존성 갱신
- `next-pwa`와 Workbox 6 의존 경로 제거, Serwist `9.5.12` 전환
- `next lint` 제거에 따라 ESLint 9 flat config와 `eslint .` 사용

## Next.js 16 호환 정책

- `params`, `searchParams`, `headers()`, `cookies()`는 비동기 API로 사용한다.
- `revalidateTag`는 기존 즉시 만료 의미를 유지하도록 `{ expire: 0 }` 프로필을 명시한다.
- 요청 전 인증·인가 파일은 `middleware.ts` 대신 `proxy.ts` 규약을 사용한다.
- Server Component의 `dynamic(..., { ssr: false })`는 Client Component loader로 경계를 옮긴다.
- Serwist webpack 통합을 사용하므로 `next dev --webpack`, `next build --webpack`을 명시한다. Turbopack 전환은 Serwist 지원과 PWA 회귀 검증을 별도 수행한 뒤 결정한다.

## PWA 보존 항목

- `/sw.js` 자동 등록과 `/` scope
- document 네트워크 실패 시 `/offline` fallback
- `pwa-push.js`의 푸시 표시 직전 세션·endpoint 소유권 재검증
- 서비스 워커 즉시 활성화와 기존 탭 제어
- API·RSC·HTML은 runtime cache에서 제외하고 `/_next/static`, `/images`만 캐시해 계정 전환 시 사용자 응답 잔존을 차단

production build를 `next start`로 실행한 Chromium smoke에서 서비스 워커 활성 URL, 오프라인 document fallback, 공개 페이지 3개를 확인한다.

## audit 판정

`npm audit --omit=dev` 기준 취약점은 49건(critical 1 포함)에서 3건(high 3)으로 감소했다.

남은 3건은 `prisma → @prisma/config → deepmerge-ts@7` 한 경로가 package 단위로 집계된 결과다. npm의 자동 수정 제안은 Prisma `7.9.1`을 `6.12.0`으로 강제 다운그레이드하므로 적용하지 않는다. 이 경로는 application request runtime이 아니라 Prisma CLI 설정 처리 경로이며 다음 Prisma 7 패치에서 `deepmerge-ts >= 8` 반영 여부를 재확인한다.

CI의 `npm run audit:production`은 이 high 3건을 계속 출력해 기준선을 숨기지 않으면서 critical 취약점이 새로 유입되면 실패하도록 설정한다. hardcoded secret은 별도 `Dependency and Secret Audit` job에서 전체 Git 이력을 Gitleaks로 검사해 차단한다.

다음 명령은 사용하지 않는다.

```bash
npm audit fix --force
```

## 검증 명령

```bash
npm run test
npx tsc --noEmit
npm run lint
npm run build
npx prisma validate
npm run audit:production
git diff --check
```

## 병합 전 후속 확인

[Next.js 공식 공지](https://nextjs.org/blog)에 따르면 2026-08-26에 Next.js 16.3·15.5 대상 critical 보안 패치가 예정되어 있다. `master` 병합 전에 16.3 최신 patch를 다시 조회하고 업그레이드·전체 검증을 반복한다.

배포 Preview에서는 PWA 설치, 오프라인 fallback, 실제 Web Push 수신·클릭 이동을 한 번 더 smoke test한다.
