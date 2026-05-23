# 소셜 공유 OG 이미지 라우트 트러블슈팅

## 문제 요약

제품, 게시글, 방송 상세는 모두 공유 시점에 대표 이미지와 제목이 함께 보여야 합니다.

하지만 릴리즈 전 점검 중 아래 현상이 함께 확인되었습니다.

- `/products/view/[id]/opengraph-image`를 브라우저에서 직접 열면 앱의 Not Found 화면이 표시됨
- KakaoTalk 공유 미리보기에 상품별 이미지가 아니라 기본 BoardPort 이미지가 표시됨
- 로컬 Windows 환경에서 `/og-image` 진입 시 `@vercel/og` 폰트 경로 관련 `Invalid URL` 오류 발생
- `runtime` export가 문자열 리터럴이 아니라는 Next.js build 경고 발생

이 문제는 단순 UI 이슈가 아니라, **Next Metadata 이미지 라우트와 외부 소셜 크롤러가 안정적으로 호출할 수 있는 이미지 URL을 분리해야 하는 문제**였습니다.

## 1. 증상

### 1.1 직접 테스트 URL과 metadata route가 다르게 동작함

`opengraph-image.tsx`는 Next.js Metadata API의 file-based metadata route입니다.
빌드 결과나 크롤러 접근 방식에 따라 내부적으로 해시가 붙은 경로가 사용되는 케이스가 있어, 브라우저에서 `/opengraph-image`를 직접 열어 확인하는 흐름과 실제 metadata 해석 흐름이 항상 같지 않았습니다.

따라서 직접 확인 가능한 안정 URL이 없으면, 공유 미리보기 문제를 로컬에서 빠르게 재현하기 어렵습니다.

### 1.2 공유 앱에서 기본 사이트 이미지가 표시됨

공유 대상 앱은 HTML의 `og:image`를 크롤링해 별도 캐시합니다.

배포 전 코드나 이전 캐시가 남아 있을 때 상세별 이미지가 정상 생성되어도 공유 앱에는 다음처럼 보였습니다.

- `보드포트 - 모든 게임이 모이는 곳`
- 기본 로고 이미지
- 이전 공유 결과 skeleton 또는 오래된 preview

### 1.3 Windows 로컬에서 `@vercel/og` 폰트 경로 오류 발생

로컬 Windows 환경에서 `next/og` 기반 이미지 생성 중 다음 유형의 오류가 발생했습니다.

```text
TypeError: Invalid URL
input: '.\file:\C:\...\node_modules\next\dist\compiled\@vercel\og\noto-sans-v27-latin-regular.ttf'
```

이는 이미지 생성 코드가 애플리케이션 로직까지 도달하기 전에 `@vercel/og` 내부 폰트 경로 처리에서 실패하는 형태였습니다.

## 2. 근본 원인

### 원인 A. 직접 검증 가능한 고정 이미지 URL이 부족했음

`opengraph-image.tsx`만 있으면 Next Metadata API에는 충분하지만, 사람이 브라우저에서 직접 열어 검증하거나 외부 공유 앱 캐시를 추적할 때는 고정 확인 URL로 쓰기 어렵습니다.

그래서 상세 HTML에는 크롤러가 안정적으로 접근하고, 개발자가 직접 검증할 수 있는 명시적인 `/og-image` 라우트가 필요했습니다.

현재 기준:

- `/products/view/[id]/og-image`
- `/posts/[id]/og-image`
- `/streams/[id]/og-image`

### 원인 B. `runtime`은 문자열 리터럴이어야 함

Next.js는 Route Handler와 Metadata route의 `runtime` export를 정적으로 분석합니다.
`export const runtime = SOME_CONST`처럼 간접 할당하면 다음 경고가 날 수 있습니다.

```text
Next.js can't recognize the exported `runtime` field ... as it was not assigned to a string literal.
```

이 경우 의도한 runtime이 적용되지 않아 이미지 생성 오류와 함께 원인 파악이 어려워질 수 있습니다.

### 원인 C. 공유 앱 캐시와 배포 타이밍이 검증을 흐림

KakaoTalk 같은 공유 앱은 URL preview를 캐시합니다.
로컬 수정이 끝났더라도 배포가 아직 안 됐거나, 공유 앱 캐시가 남아 있으면 수정 결과가 바로 보이지 않을 수 있습니다.

즉, 로컬 `/og-image` 성공과 공유 앱 preview 성공은 같은 단계가 아닙니다.

## 3. 해결 전략

### 전략 1. Metadata route와 안정 공유 route를 함께 유지

`opengraph-image.tsx`는 Next Metadata API 엔트리로 유지하고, `og-image/route.tsx`는 외부 공유 검증용 고정 URL로 둡니다.

중요한 점은 상세 페이지 전체를 공개한 것이 아니라, 공유 이미지 생성을 위한 `/og-image` route만 안정 검증 경로로 둔 것입니다.
실제 상세 상호작용과 보호 데이터는 기존 인증/권한 정책을 따릅니다.

관련 파일:

- `products/view/[id]/opengraph-image.tsx`
- `products/view/[id]/og-image/route.tsx`
- `posts/[id]/opengraph-image.tsx`
- `posts/[id]/og-image/route.tsx`
- `streams/[id]/opengraph-image.tsx`
- `streams/[id]/og-image/route.tsx`

상세 페이지 metadata는 안정 URL을 `openGraph.images`로 내려줍니다.

관련 파일:

- `products/view/[id]/page.tsx`
- `posts/[id]/page.tsx`
- `streams/[id]/page.tsx`

### 전략 2. `runtime = "nodejs"`를 문자열 리터럴로 명시

OG route는 DB 조회와 `sharp` 기반 PNG 생성을 사용하므로 `nodejs` runtime을 명시합니다.

```ts
export const runtime = "nodejs";
```

빌드 경고가 다시 나오면, 상수 재사용이나 re-export 없이 해당 파일에서 문자열 리터럴로 직접 선언되어 있는지 먼저 확인합니다.

### 전략 3. `next/og` 대신 `sharp` 기반 PNG 생성으로 우회

Windows 로컬의 `@vercel/og` 폰트 경로 오류를 피하기 위해, 현재 OG 이미지는 SVG 문자열을 만들고 `sharp`로 PNG를 생성합니다.

핵심 흐름:

1. DB에서 상세 데이터 조회
2. 텍스트 escape와 줄 분리
3. SVG 정보 패널 생성
4. 외부 대표 이미지 fetch
5. `sharp().composite()`로 이미지 합성
6. `image/png` Response 반환

이 구조는 소셜 크롤러가 요구하는 정적 PNG 응답에 가깝고, 로컬 검증도 쉽습니다.

### 전략 4. 스트리밍은 VOD 썸네일 우선순위 적용

방송 상세는 라이브 썸네일과 다시보기 썸네일이 모두 있을 수 있습니다.
다시보기 공유 이미지에서는 방송 카드와 같은 기준으로 최신 ready VOD 썸네일을 먼저 사용합니다.

우선순위:

1. 최신 ready VOD `thumbnail_url`
2. 방송 `thumbnail`
3. 기본 BoardPort fallback

상대 경로 썸네일이 들어오는 경우에는 `NEXT_PUBLIC_APP_URL`을 기준으로 절대 URL로 보정합니다.
따라서 소셜 공유 미리보기 검증 전에는 production 환경의 `NEXT_PUBLIC_APP_URL`이 실제 배포 도메인을 가리키는지도 함께 확인합니다.

비공개/삭제/외부 이미지 fetch 실패 상황에서는 민감 정보 없이 브랜드 기본 이미지 또는 텍스트 중심 fallback을 반환합니다.

## 4. 검증 순서

### 4.1 로컬 직접 확인

아래 URL을 브라우저에서 직접 열어 `image/png`가 보이는지 확인합니다.

```text
http://localhost:3000/products/view/69/og-image
http://localhost:3000/posts/1/og-image
http://localhost:3000/streams/1/og-image
```

확인 포인트:

- Not Found 화면이 아니라 이미지가 표시되는지
- 제목/설명/가격/작성자/방송국 텍스트가 박스 안에 들어오는지
- 대표 이미지가 있으면 합성되고, 없으면 fallback이 보이는지
- 너무 긴 텍스트가 카드 밖으로 넘치지 않는지

### 4.2 빌드 확인

```bash
npm run build
```

확인 포인트:

- `runtime` 정적 분석 경고가 없는지
- OG route가 빌드 중 예외를 만들지 않는지

### 4.3 배포 후 공유 앱 확인

소셜 preview는 로컬이 아니라 배포 URL을 기준으로 확인해야 합니다.

확인 순서:

1. 배포 완료
2. 배포 URL의 `/og-image` 직접 확인
3. 상세 페이지 HTML의 `og:image`가 `/og-image`를 가리키는지 확인
4. KakaoTalk 등 공유 앱에서 새 URL 또는 캐시 갱신 후 확인

공유 앱에서 예전 이미지가 남으면 앱 캐시 문제인지 먼저 분리합니다.
로컬과 배포 `/og-image`가 모두 정상인데 공유 앱만 다르게 보인 케이스는 코드 오류보다 크롤러 캐시 문제로 분리했습니다.

## 5. 운영 판단 기준

릴리즈 차단:

- `/og-image`가 500을 반환함
- `image/png` 대신 HTML Not Found가 반환됨
- 빌드에서 OG route 관련 오류가 발생함
- 공유 이미지가 핵심 텍스트를 카드 밖으로 넘김

릴리즈 비차단:

- 공유 앱의 이전 URL 캐시가 잠시 남음
- 삭제된 상세나 비공개 접근 불가 상세가 fallback 이미지를 반환함
- 외부 대표 이미지 fetch 실패 시 텍스트 중심 fallback이 표시됨

## 6. 정리

BoardPort의 소셜 공유 이미지는 `opengraph-image.tsx`와 크롤러 검증용 `/og-image` Route Handler를 함께 유지하는 방식으로 정리했습니다.

현재 남긴 기준은 아래와 같습니다.

1. 상세 metadata는 안정적인 `/og-image` URL을 사용
2. `runtime = "nodejs"`는 문자열 리터럴로 명시
3. Windows 로컬 `@vercel/og` 경로 문제는 `sharp` 기반 PNG 생성으로 회피
4. 공유 앱 preview는 배포 후 캐시까지 고려해 판단

## 7. 함께 보면 좋은 문서

- [BoardPort 프로젝트 개요](../architecture/boardport-project-overview.md)
- [BoardPort UI/UX 디자인 기준](../design/boardport-uiux-design-standard.md)
