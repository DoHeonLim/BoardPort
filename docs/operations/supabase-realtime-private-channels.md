# Supabase Realtime Private Channel 운영 Runbook

<!--
File Name : docs/operations/supabase-realtime-private-channels.md
Description : BoardPort private Realtime 인증·인가 적용 및 검증 절차
Author : 임도헌

History
Date        Author   Status    Description
2026.08.21  임도헌   Created   JWT·RLS·server Broadcast 배포 순서와 smoke matrix 정리
2026.08.21  임도헌   Modified  ES256 signing key 생성·등록·회전 절차로 전환
2026.08.22  임도헌   Modified  Supabase CLI 2.115 stdout 기준 private JWK 저장 절차 보정
2026.08.22  임도헌   Modified  Realtime JWT 만료 캐시와 PRIVATE 언락 무효화 운영 동작 추가
-->

BoardPort Realtime은 브라우저의 공개 anon 채널 발신을 허용하지 않는다. 브라우저는 BoardPort 로그인 세션으로 발급한 5분 JWT를 사용해 private 채널을 구독하고, 발신은 서버의 Supabase secret key를 사용하는 REST Broadcast 경계만 담당한다.

BoardPort 데이터 조회·변경은 Prisma 서버 경계만 사용한다. migration은 `anon`과 `authenticated`의 public schema table/sequence/function 권한을 제거해 Realtime JWT가 Supabase Data API를 통해 application table에 접근하지 못하게 한다. Realtime policy가 호출하는 topic 판정 함수만 `authenticated`에 다시 허용한다.

## 1. 환경 변수

| 변수 | 용도 | 노출 범위 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | 브라우저 공개 |
| `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY` | 브라우저 Realtime 연결용 publishable/anon key | 브라우저 공개 |
| `SUPABASE_SECRET_KEY` | private Broadcast REST 발신용 secret key | 서버 전용 |
| `SUPABASE_REALTIME_SIGNING_KEY_JWK` | BoardPort 단기 Realtime JWT ES256 서명 | 서버 전용 |

- `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`에는 `sb_publishable_...`, `SUPABASE_SECRET_KEY`에는 `sb_secret_...` 형식의 새 API key를 사용한다.
- signing key는 `ES256` P-256 private JWK여야 하며 `kty`, `crv`, `kid`, `d`, `x`, `y`가 필요하다.
- 앱은 원문 JSON 또는 base64 JWK를 읽을 수 있다. 로컬 `.env`, Vercel, GitHub에는 개행·따옴표 문제를 피하기 위해 JWK JSON 전체를 base64 한 줄로 저장한다.
- private JWK와 secret key는 브라우저 코드, 로그, 저장소에 포함하지 않는다. Supabase에 import한 private key는 다시 추출할 수 없으므로 별도 secret manager에도 안전하게 백업한다.
- 브라우저는 서버가 반환한 만료 시각까지 Realtime JWT를 재사용하고 30초 여유를 두고 갱신한다. PRIVATE 방송 비밀번호 해제로 `unlocked_broadcast_ids`가 바뀌거나 로그아웃·탈퇴·다른 탭 인증 종료가 발생하면 캐시를 즉시 폐기한다.

## 2. Signing key와 API key 준비

1. 저장소 밖의 임시 디렉터리에서 Supabase CLI 최신 버전으로 private JWK를 생성한다.

   ```bash
   BOARDPORT_SIGNING_KEY_DIR="$(mktemp -d)"
   cd "$BOARDPORT_SIGNING_KEY_DIR"
   npx supabase@latest init
   umask 077
   BOARDPORT_SIGNING_KEY_PATH="$BOARDPORT_SIGNING_KEY_DIR/realtime-signing-key.json"
   npx supabase@latest gen signing-key --algorithm ES256 > "$BOARDPORT_SIGNING_KEY_PATH"
   chmod 600 "$BOARDPORT_SIGNING_KEY_PATH"
   ```

   Supabase CLI 2.115 이상은 JWK를 파일에 자동 저장하지 않고 표준 출력으로 반환한다. 위 명령은 그 출력을 권한 `600`인 `$BOARDPORT_SIGNING_KEY_PATH`에 직접 저장한다. CLI가 함께 표시하는 로컬 프로젝트용 `supabase/signing_keys.json` 안내는 BoardPort 운영 키 import에는 사용하지 않는다.

   ```bash
   node -e 'const fs=require("fs");const key=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(key.kty!=="EC"||key.crv!=="P-256"||!key.kid||!key.d)throw new Error("invalid ES256 private JWK");console.log("valid ES256 private JWK:",key.kid)' "$BOARDPORT_SIGNING_KEY_PATH"
   ```

2. 생성된 JWK 원본을 Supabase Dashboard의 Project Settings > JWT Keys에서 새 standby key로 import한다.
3. import한 key의 `kid`가 원본 JWK의 `kid`와 같은지 확인한 다음 Rotate key로 current 상태로 전환한다. key 상태 변경 사이에는 약 5분 제한이 있을 수 있다.
4. 같은 JWK JSON을 base64 한 줄로 변환해 `SUPABASE_REALTIME_SIGNING_KEY_JWK`에 저장한다.

   ```bash
   node -e 'const fs=require("fs");const key=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(Buffer.from(JSON.stringify(key)).toString("base64"))' "$BOARDPORT_SIGNING_KEY_PATH"
   ```

5. Project Settings > API Keys에서 publishable key와 서버 전용 secret key를 생성한다.

BoardPort가 직접 만든 JWT를 Supabase가 검증해야 하므로 Dashboard가 자체 생성한 private key가 아니라, BoardPort가 보관할 수 있도록 직접 생성한 JWK를 import해야 한다. 기존 legacy key는 새 구성이 검증될 때까지 revoke하지 않는다.

## 3. 적용 순서

1. Vercel Production/Preview에 `SUPABASE_SECRET_KEY`, `SUPABASE_REALTIME_SIGNING_KEY_JWK`을 Sensitive 변수로 등록하고 public key도 최신 값으로 교체한다.
2. GitHub Actions E2E secrets에 `E2E_SUPABASE_SECRET_KEY`, `E2E_SUPABASE_REALTIME_SIGNING_KEY_JWK`을 등록한다.
3. 대상 Supabase DB에 `npx prisma migrate deploy`로 Realtime Authorization migration을 적용한다.
4. migration의 `BoardPort authorized private broadcasts` SELECT policy가 `realtime.messages`에 생성됐는지 확인한다.
5. 새 애플리케이션을 배포하고 로그인 사용자 기준 private 구독과 서버 발신을 smoke test한다.
6. 정상 동작 확인 후 Supabase Dashboard의 Realtime Settings에서 public channel access를 비활성화한다.
7. public access 비활성화 뒤 아래 권한 matrix를 다시 확인한다.

public channel 비활성화는 기존 공개 연결을 끊을 수 있으므로 migration과 새 코드 배포보다 먼저 수행하지 않는다.

## 4. 권한 Smoke Matrix

| 대상 | 허용 | 거절 |
| --- | --- | --- |
| 사용자 알림 | 본인의 `user:{id}:notifications` | 비회원, 다른 사용자 |
| 채팅방 목록 | 본인의 `user:{id}:chat-rooms` | 비회원, 다른 사용자 |
| 상품 채팅 | 해당 `ProductChatRoom` 참여자 | 방 비참여자 |
| 방송 채팅 PUBLIC | 차단 관계가 없는 로그인 사용자 | 양방향 차단 사용자 |
| 방송 채팅 FOLLOWERS | 방송 주인 또는 팔로워 | 비팔로워, 차단 사용자 |
| 방송 채팅 PRIVATE | 방송 주인 또는 현재 세션에서 비밀번호를 해제한 사용자 | 미해제 사용자, 차단 사용자 |
| 클라이언트 Broadcast 발신 | 없음 | `message`, `sys_event`, 기타 모든 이벤트 |

추가 확인 항목:

- 탭을 숨겼다가 복귀하면 알림 수, 채팅 목록, 상품 채팅, 방송 채팅이 DB 상태로 수렴한다.
- 네트워크 연결을 끊었다가 복구하면 재구독 후 누락 상태가 재조회된다.
- 방송 상태 이벤트 payload에는 내부 `broadcastId`만 있고 status, owner, provider UID가 없다.
- 서버 Broadcast 실패가 상품·채팅·알림 DB mutation 자체를 롤백하지 않는다.

## 5. 검증 명령

```bash
npm run test
npm run test:migration:realtime
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

`test:migration:realtime`은 테이블과 RLS를 생성·삭제하므로 `localhost`의 `boardport_migration_test` 전용 DB만 허용한다. 운영 Supabase URL로는 실행되지 않는다.

## 6. 장애 및 롤백

- token API가 `503`이면 `SUPABASE_REALTIME_SIGNING_KEY_JWK` 누락, base64/JSON 형식, `kid`를 먼저 확인한다.
- private join이 거절되면 signing key가 current인지, JWT의 `kid`, `role`, `boardport_user_id`, 만료 시각과 RLS policy 적용 여부를 확인한다.
- 서버 이벤트만 누락되면 `SUPABASE_SECRET_KEY`와 `/realtime/v1/api/broadcast` 응답 상태를 확인한다.
- 긴급 롤백은 public access만 다시 켜는 것으로 끝나지 않는다. 새 topic 이름과 서버 발신 경계가 함께 바뀌었으므로 애플리케이션 코드 rollback 여부도 같이 판단한다.

참고: [Supabase JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys), [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys), [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization), [Supabase Broadcast REST API](https://supabase.com/docs/guides/realtime/broadcast), [Supabase JavaScript setAuth](https://supabase.com/docs/reference/javascript/setauth)
