# Cloudflare Stream Signed Playback 전환 절차

이 문서는 BoardPort 라이브/VOD를 원본 Cloudflare UID가 아니라 권한 확인 후 발급한 단기 token으로만 재생하도록 전환하는 운영 절차다.

## 1. 코드와 외부 설정의 경계

- Prisma migration은 `LiveInput.requireSignedURLs`의 로컬 기본값과 기존 row를 `true`로 맞춘다.
- 신규 생성·키 재발급 코드는 Cloudflare Live Input의 `recording.requireSignedURLs=true`를 요청한다.
- 기존 Cloudflare Live Input의 원격 설정은 DB migration으로 변경되지 않는다. 배포 전에 전수 backfill이 필요하다.
- 애플리케이션은 signing key가 없거나 잘못되면 원본 UID로 fallback하지 않고 재생을 실패시킨다.

## 2. 준비

1. Cloudflare Stream signing key를 생성한다.
2. 응답의 key ID와 base64 JWK를 아래 production 환경변수에 저장한다.
   - `CLOUDFLARE_STREAM_SIGNING_KEY_ID`
   - `CLOUDFLARE_STREAM_SIGNING_KEY_JWK`
3. Vercel Preview에서 PUBLIC, FOLLOWERS, PRIVATE 라이브/VOD의 허용·거부 경계를 확인한다.
4. production DB의 모든 `LiveInput.provider_uid`와 `VodAsset.provider_asset_id`를 export하고 대상 수를 기록한다.
5. 각 Live Input/VOD의 `allowedOrigins`를 조회해 비어 있거나 과도한 값을 별도 변경 목록에 기록한다. 이 값은 signed token의 필수 조건은 아니지만 token의 타 도메인 임베딩을 줄이는 추가 방어다.

signing private JWK는 API token과 같은 서버 비밀이다. 브라우저 환경변수, 로그, PR 본문에 넣지 않는다.

## 3. 기존 Live Input·VOD backfill

BoardPort 운영 DB에 연결된 자산은 아래 스크립트로 조회·적용한다. 기본 실행은
dry-run이며 Cloudflare 설정을 변경하지 않는다. 대상 개수가 Live Input 5개, VOD
7개와 다르면 실제 적용 전에 중단한다.

```bash
npm run backfill:stream-signed-playback
npm run backfill:stream-signed-playback -- --apply
```

스크립트는 `.env`를 직접 파싱하므로 shell에서 `source .env`를 실행하지 않는다.
전체 UID와 Live Input의 송출 키는 출력하지 않으며, 이미 적용된 자산은 건너뛴다.

각 `LiveInput.provider_uid`에 대해 먼저 현재 Live Input 설정을 조회한다. 아래 값만 보낸다고 가정하지 말고 기존 `recording.mode`, `timeoutSeconds`, `allowedOrigins`, `hideLiveViewerCount`를 보존한 상태에서 `requireSignedURLs`만 `true`로 병합해 update한다.

아래 값은 구조 예시다. `timeoutSeconds`, `allowedOrigins`, `hideLiveViewerCount`는 조회한 현재 값 또는 승인된 변경값으로 대체하고 그대로 복사하지 않는다.

```json
{
  "recording": {
    "mode": "automatic",
    "requireSignedURLs": true,
    "timeoutSeconds": 0,
    "allowedOrigins": ["boardport.example"],
    "hideLiveViewerCount": false
  }
}
```

이 요청은 `PUT /accounts/{account_id}/stream/live_inputs/{input_id}`로 실행한다. Live Input 설정은 이후 녹화본의 기본 정책과 Live Input ID 재생에 적용된다.

`allowedOrigins`를 적용할 때는 scheme이나 path가 아닌 도메인을 등록한다. Vercel 전체 wildcard처럼 다른 프로젝트까지 포함하는 넓은 값보다 production 도메인과 고정 Preview alias를 명시한다. 동적 Preview hostname을 전부 허용해야 한다면 보안 범위를 별도로 기록한다.

이미 생성된 각 `VodAsset.provider_asset_id`도 Cloudflare video update API로 별도 보강한다. 과거 녹화본은 Live Input 변경만으로 video ID 직접 재생이 차단됐다고 가정하지 않는다.

```json
{
  "uid": "<VIDEO_UID>",
  "requireSignedURLs": true
}
```

이 요청은 `POST /accounts/{account_id}/stream/{video_uid}`로 실행한다.

운영 변경은 소량 배치로 실행하고, 성공 UID·실패 UID·HTTP 상태를 별도 작업 로그에 남긴다. 일부만 성공한 상태에서는 애플리케이션 배포를 완료하지 않는다.

## 4. 검증

샘플이 아니라 전체 Live Input과 기존 VOD의 원격 설정을 다시 조회해 `requireSignedURLs=true`와 승인된 `allowedOrigins`를 확인한다. 그다음 각 공개 범위별로 아래를 검증한다.

| 시나리오 | 기대 결과 |
| --- | --- |
| 원본 Live Input/VOD UID iframe | 재생 거부 |
| 유효한 로그인·권한·단기 token | 재생 성공 |
| 팔로우 취소 후 새 요청 | 상세·댓글·좋아요·채팅 거부 |
| PRIVATE unlock 없는 새 세션 | 재생·상호작용 거부 |
| 만료 token | 재생 거부 |
| 제한 방송 metadata/OG | generic 문구, `noindex` |

## 5. 배포와 복구

권장 순서는 signing key 환경변수 등록, 새 Preview 배포와 signed token 재생 확인, 코드·DB migration production 배포, 기존 Live Input/VOD backfill, 전수 검증 순이다. Vercel 환경변수 변경은 기존 배포에 소급되지 않으므로 반드시 새 배포에서 확인한다. backfill 완료 전에는 원본 UID 재생 차단이 보장되지 않으므로 master 릴리즈 완료로 판단하지 않는다.

문제가 발생하면 원본 UID fallback을 코드에 추가하지 않는다. 배포를 되돌리고 signing key·Cloudflare 원격 설정·토큰 시각 오차를 확인한다. 보안 정책 자체를 해제하는 rollback은 별도 승인과 위험 기록이 필요하다.

## 6. 참고

- [Cloudflare Stream signed URLs](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
- [Cloudflare Stream live input 생성](https://developers.cloudflare.com/stream/stream-live/start-stream-live/)
- [Cloudflare Stream 라이브 재생](https://developers.cloudflare.com/stream/stream-live/watch-live-stream/)

## 7. 실행 기록

- `2026.08.21`: Production에서 RS256 token 기반 VOD thumbnail과 녹화본 재생을 확인했다.
- `2026.08.21`: 운영 DB 대상 dry-run에서 Live Input 5개와 VOD 7개가 모두 `requireSignedURLs=false`임을 확인했다.
- `2026.08.21`: 12개 자산을 모두 `true`로 전환했으며 적용 직후 검증과 재실행 dry-run에서 Live Input 5/5, VOD 7/7을 확인했다.
- 전체 UID, 송출 키와 signing private JWK는 실행 로그에 기록하지 않았다.
