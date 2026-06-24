# 게시글 블록 콘텐츠 시스템 설계

BoardPort 게시글은 단순 문자열 본문으로 두지 않고, 텍스트, 이미지, 동영상, 임베드를 조합할 수 있는 블록 기반 구조로 만들었습니다.

## 1. 목표

- 본문, 이미지, 동영상, 임베드의 순서를 유지
- 상세 렌더링과 수정 화면에서 같은 구조를 재사용
- HTML 문자열 저장보다 안전하게 렌더링·수정·미디어 정리를 수행할 수 있는 구조 유지
- Cloudflare 동영상 처리 상태를 게시글 저장 흐름과 분리
- 공유 미리보기와 검색에 필요한 요약 필드는 별도로 유지

## 2. 콘텐츠 모델

- `Post`: 게시글 기본 정보, 카테고리, 위치, 요약 필드
- `PostBlock`: 본문 순서와 블록 타입
- `PostImage`: 이미지 URL, 순서, Cloudflare 이미지 정보
- `PostVideo`: Cloudflare Stream UID, 처리 상태, draftKey

블록 타입은 다음 기준으로 제한했습니다.

```text
TEXT
IMAGE
VIDEO
EMBED
```

## 3. 작성 흐름

1. 사용자가 텍스트와 미디어를 편집
2. 이미지 업로드는 Cloudflare Images로 처리
3. 동영상 업로드는 Cloudflare Stream 처리 상태를 별도 draft로 관리
4. 제출 시 블록 순서를 조립
5. 게시글 저장 후 draft 동영상을 게시글에 연결

## 4. 동영상 처리 전략

Cloudflare 웹훅은 게시글 저장보다 먼저 도착할 수 있습니다.

그래서 동영상 처리 상태는 게시글 ID에만 의존하지 않고, 업로드 시점의 `draftKey`와 Cloudflare UID를 함께 사용합니다.

- READY 웹훅이 먼저 오면 draft 상태를 보존
- 게시글 저장 후 draft를 연결
- 실패 웹훅은 terminal state인 `FAILED`로 수렴
- 사용자는 처리 중/실패 상태를 UI에서 확인

## 5. 설계 판단

- 본문 전체를 HTML로 저장하지 않고 블록 구조로 유지
- 미디어는 본문과 별도 테이블로 관리해 삭제/정리 가능성을 확보
- 현재 범위에서는 동영상 복잡도를 줄이기 위해 게시글당 1개를 기준으로 제한
- `description`은 검색/OG/호환 목적의 요약 필드로 유지

## 6. 관련 문서

- [게시글 동영상 Cloudflare 웹훅 트러블슈팅](../troubleshooting/troubleshooting-post-video-cloudflare-webhook.md)
- [소셜 공유 OG 이미지 라우트 트러블슈팅](../troubleshooting/troubleshooting-social-og-image-routes.md)
