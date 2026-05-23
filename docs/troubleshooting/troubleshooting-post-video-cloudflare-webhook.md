# 게시글 동영상 Cloudflare 웹훅 상태 전환 트러블슈팅

## 문제 요약

게시글 동영상 첨부는 Cloudflare Stream direct upload와 웹훅을 함께 사용합니다.

사용자 입장에서는 동영상을 첨부하고 게시글을 저장하면, 상세 화면에서 잠시 `PROCESSING`으로 보이다가 인코딩 완료 후 `READY` iframe으로 바뀌어야 합니다.

릴리즈 전 점검 중 게시글 동영상이 `PROCESSING`에서 `READY`로 넘어가지 않는 현상이 확인되었습니다.

**Before:** 일부 동영상이 `PROCESSING`에 머물러, 인코딩 지연인지 실패인지 사용자가 구분하기 어려웠습니다.

**After:** READY 선도착과 실패 웹훅을 처리하고 draft 연결 단서를 보존해, 동영상 상태가 `READY` 또는 `FAILED`로 수렴하도록 정리했습니다.

## 1. 증상

### 1.1 게시글 상세가 계속 처리 중으로 남음

동영상 업로드와 게시글 저장은 완료됐지만 상세 화면에는 계속 아래 상태가 남습니다.

- `PROCESSING`
- “Cloudflare에서 동영상을 처리하고 있습니다.”
- 재생 iframe 미표시

### 1.2 Cloudflare 처리 실패가 사용자에게 드러나지 않음

파일 길이 제한, 손상 파일, Cloudflare 내부 처리 실패가 발생해도 실패 웹훅을 처리하지 않으면 내부 상태가 계속 `PROCESSING`으로 남습니다.

이 경우 사용자는 기다리면 해결될 문제인지, 다시 업로드해야 하는 문제인지 구분할 수 없습니다.

### 1.3 READY 웹훅이 게시글 저장보다 먼저 도착할 수 있음

direct upload는 다음 순서가 항상 보장되지 않습니다.

1. 업로드 세션 생성
2. Cloudflare 업로드 완료
3. Cloudflare `video.ready` 웹훅 도착
4. 사용자가 게시글 저장
5. `PostVideo`가 실제 게시글에 연결

웹훅이 4번보다 먼저 도착하면, `draftKey`를 너무 일찍 해제하는 코드에서는 게시글 저장 시 연결 단서를 잃을 수 있습니다.

## 2. 근본 원인

### 원인 A. 웹훅 도착 순서와 게시글 저장 순서가 독립적임

Cloudflare 웹훅은 사용자 폼 저장 흐름과 별도로 도착합니다.
따라서 서버는 READY 선도착과 게시글 저장 선도착을 모두 처리해야 합니다.

### 원인 B. 실패 웹훅을 무시하면 terminal state가 없음

Cloudflare가 error 상태를 보내도 앱이 이를 `FAILED`로 반영하지 않으면, `PostVideo`는 계속 대기 상태로 남습니다.

`PROCESSING`은 중간 상태이므로 반드시 `READY` 또는 `FAILED`로 수렴해야 합니다.

### 원인 C. 식별자 후보가 하나가 아님

게시글 동영상 draft는 상황에 따라 아래 값 중 하나로 매칭해야 합니다.

- `providerAssetId`
- `uploadUid`
- `draftKey`

웹훅 payload의 `meta`와 Cloudflare asset uid를 모두 활용하지 않으면 일부 케이스에서 draft를 찾지 못합니다.

## 3. 해결 전략

### 전략 1. 게시글 동영상 payload를 meta 기준으로 구분

Cloudflare Stream은 라이브 방송 VOD와 게시글 첨부 영상을 모두 보낼 수 있습니다.
게시글 첨부 영상은 `meta.sourceType` 등 게시글 영상용 메타데이터로 구분합니다.

관련 파일:

- `cloudflare webhook route`
- `stream types`

### 전략 2. READY 선도착 시에도 draftKey를 보존

READY 웹훅에서 `PostVideo.status`는 `READY`로 바꾸되, `draftKey`는 바로 지우지 않습니다.
`draftKey`는 실제 게시글 저장 시 `attachDraftVideoToPost` 흐름에서 해제합니다.

이렇게 해야 Cloudflare 처리가 먼저 끝나도 사용자가 나중에 게시글을 저장할 때 draft를 안정적으로 연결할 수 있습니다.

관련 파일:

- `post video service`
- `cloudflare webhook route`

### 전략 3. error 웹훅은 `FAILED`로 수렴

Cloudflare 처리 실패 payload는 `PostVideo.status = "FAILED"`로 반영합니다.

이 상태를 UI에서 보여주면 사용자는 처리 중으로 무한 대기하지 않고 다시 업로드를 선택할 수 있습니다.

관련 파일:

- `PostDetailVideo.tsx`
- `PostEditorBlocksField.tsx`

### 전략 4. 클라이언트 업로드 실패도 draft 실패로 반영

브라우저 direct upload 자체가 실패한 경우에는 서버 웹훅을 기다리지 않고 생성된 draft를 `FAILED`로 표시합니다.

관련 파일:

- `usePostVideoUpload.ts`
- `video actions`

## 4. 점검 순서

### 4.1 업로드 직후 DB 상태 확인

업로드 세션 생성 후 `PostVideo`가 생성되어야 합니다.

확인 포인트:

- `status = PROCESSING`
- `draftKey` 존재
- `uploadUid` 또는 `providerAssetId` 존재
- 작성자 user id가 현재 사용자와 일치

### 4.2 Cloudflare 웹훅 수신 확인

Vercel logs 또는 서버 로그에서 `/api/webhooks/cloudflare` 요청을 확인합니다.

확인 포인트:

- 200 응답 여부
- 서명 검증 실패 여부
- `video.ready` 또는 error payload 분기 여부
- 게시글 동영상 payload로 판별됐는지 여부

### 4.3 READY 매칭 확인

READY 웹훅 후 `PostVideo`가 아래처럼 갱신되어야 합니다.

- `status = READY`
- `providerAssetId` 또는 `uploadUid`가 Cloudflare asset uid와 연결
- `draftKey`는 게시글 저장 전이면 유지

### 4.4 게시글 저장 후 연결 확인

게시글 저장 후에는 draft가 실제 게시글에 연결되어야 합니다.

확인 포인트:

- `postId` 연결
- `draftKey` 해제
- 상세 화면에서 READY iframe 표시

### 4.5 실패 케이스 확인

Cloudflare error payload 또는 direct upload 실패 후에는 아래처럼 보여야 합니다.

- `status = FAILED`
- 상세/수정 화면에서 실패 안내 표시
- 사용자가 다시 업로드 가능

## 5. 운영 판단 기준

릴리즈 차단:

- 정상 파일도 반복적으로 `PROCESSING`에 고착됨
- Cloudflare 웹훅이 401/500으로 반복 실패함
- error payload가 `FAILED`로 수렴하지 않음
- READY 선도착 후 게시글 저장 시 동영상 연결이 끊김

릴리즈 비차단:

- Cloudflare 인코딩 지연으로 짧은 시간 `PROCESSING`이 유지됨
- 삭제된 draft나 취소된 업로드에 대한 늦은 웹훅이 skip 로그만 남김
- 외부 player 내부의 추적/통계성 콘솔 로그가 재생 기능에 영향 없음

## 6. 이번에 확인한 점

### 6.1 외부 시스템 이벤트는 앱 내부 저장 흐름과 순서가 보장되지 않음

Cloudflare 웹훅은 사용자가 게시글 저장 버튼을 누르기 전에 도착할 수 있습니다. 외부 시스템이 개입하는 비동기 흐름에서는 “업로드 완료 후 저장”처럼 보이는 사용자 흐름과 실제 서버 이벤트 순서가 달라질 수 있습니다.

따라서 READY 선도착과 게시글 저장 선도착을 모두 정상 케이스로 보고 처리해야 합니다.

### 6.2 중간 상태는 반드시 terminal state로 수렴해야 함

`PROCESSING`은 “아직 결과를 모른다”는 중간 상태입니다. 이 상태가 계속 유지되면 사용자는 기다려야 하는지 다시 업로드해야 하는지 판단할 수 없습니다.

외부 처리 결과를 기다리는 상태는 성공(`READY`) 또는 실패(`FAILED`) 중 하나로 수렴해야 하며, 실패 웹훅을 무시하면 중간 상태가 고착됩니다.

### 6.3 draft 식별자는 이벤트 시점에 따라 달라짐

웹훅이 게시글 저장 전에 도착하면 아직 `postId`가 없습니다. 이 경우 `draftKey`, `uploadUid`, `providerAssetId`가 draft를 찾는 연결 단서가 됩니다.

반대로 게시글 저장 이후라면 실제 `postId` 연결 여부를 함께 확인할 수 있습니다. 외부 이벤트와 내부 저장 흐름이 교차하는 구조에서는 한 가지 식별자만 가정하면 누락 케이스가 생깁니다.

### 6.4 웹훅은 검증 후 멱등하게 처리해야 함

웹훅은 외부에서 들어오는 요청이므로 서명 검증을 통과한 요청만 상태 전환에 반영해야 합니다.

또 같은 payload가 네트워크 재시도 등으로 다시 도착할 수 있으므로, 이미 `READY` 또는 `FAILED`로 수렴한 상태에 같은 이벤트가 다시 와도 중복 생성이나 잘못된 상태 되돌림이 발생하지 않아야 합니다.

## 7. 정리

게시글 동영상 상태 전환은 Cloudflare 웹훅을 단발성 알림이 아니라, 업로드 draft와 게시글 저장 흐름 사이의 비동기 상태 동기화로 다뤄야 했습니다.

이 문제를 처리하면서 아래 기준을 남겼습니다.

1. READY 선도착 가능성 인정
2. `draftKey`는 실제 게시글 연결 전까지 보존
3. Cloudflare error payload는 `FAILED`로 수렴
4. `PROCESSING`은 최종 상태가 아니므로 고착 여부를 운영 QA에서 확인
5. 웹훅은 서명 검증을 통과한 요청만 처리하고, 같은 payload가 다시 도착해도 상태가 깨지지 않도록 멱등하게 처리

## 8. 함께 보면 좋은 문서

- [게시글 콘텐츠 시스템 설계](../design/post-content-system-design.md)
- [Lighthouse 보안 헤더 점검](./troubleshooting-lighthouse-security-headers.md)
