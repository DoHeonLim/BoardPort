# 수정 복귀 / 삭제 복귀 / `returnTo` / refresh 플래그 정리

## 문제 요약

여기서는 게시글, 제품, 녹화본 전반의 수정/삭제 후 복귀 정책과 `returnTo`, `navigationRefreshFlag`의 역할 분리를 정리합니다. 제품 상세 모달처럼 App Router 라우팅 문맥이 복잡한 사례는 [Product Modal Routing](./troubleshooting-product-modal-routing.md)에서 별도로 다룹니다.

BoardPort에서는 `목록 -> 상세 -> 수정 -> 저장/취소/삭제` 흐름이 모두 같은 방식으로 동작하지 않습니다.

- 게시글 상세 수정
- 제품 일반 상세 수정
- 제품 모달 상세 수정

처음에는 이 흐름을 모두 `router.back()`과 `navigationRefreshFlag` 조합으로 설명할 수 있다고 봤지만, 실제 구현과 테스트를 거치면서 각 흐름이 요구하는 히스토리 정책이 다르다는 점이 드러났습니다.

특히 아래 문제가 반복됐습니다.

1. 수정 완료 후 상세가 한 번 더 히스토리에 쌓이는 문제
2. `router.back()` 복귀 시 수정 화면의 스크롤 문맥이 상세에 전파되는 문제
3. 모달 상세 수정 완료 후 목록/상세 엔트리가 교차로 중복되는 문제
4. 풀페이지 상세 삭제 후 `router.replace(returnTo)`를 쓰면 목록 엔트리가 한 번 더 중복되는 문제
5. 풀페이지 상세 삭제 후 `router.back()`만 쓰면 forward history에 삭제된 상세가 남는 문제

핵심 결론은 세 가지입니다.

1. `returnTo`는 “원래 어느 목록/문맥에서 들어왔는가”를 보존하는 용도
2. `navigationRefreshFlag`는 “복귀 직후 화면을 1회만 최신화”하는 보조 장치
3. 모바일 퍼스트 기준에서는 삭제 후 forward 정리보다 back UX 안정성이 우선이다

즉, `returnTo`와 refresh 플래그는 같은 역할이 아닙니다.

## 현재 결론

현재 구현은 아래처럼 정리합니다.

| 흐름 | 기본 복귀 정책 | 최신화 방식 | fallback |
| --- | --- | --- | --- |
| 게시글 `detail-edit` | `push + back` | `post-detail-refresh:{id}` | 상세 경로 |
| 제품 `detail-edit` | `push + back` | `product-detail-refresh:{id}` | `window.location.replace()` |
| 제품 `modal-edit` | `push + back` | `product-modal-refresh:{id}` | `ProductModalReopenRelay` |
| 풀페이지 상세 삭제 | `back` 우선 | 목록 refresh flag | 도메인별 fallback |

### 1. 게시글 `detail-edit`

- 상세에서 수정 진입은 `push`
- 저장은 `history back` 우선
- 상세 화면은 `post-detail-refresh:{id}` 플래그를 1회 소비하고 `router.refresh()`
- 같은 시점에 `window.scrollTo(0, 0)`를 호출해 수정 화면의 스크롤 문맥 전파 차단
- 삭제는 수정 페이지가 아니라 상세 owner 메뉴에서 수행

이유:

- 게시글은 “상세를 읽다가 수정하고 다시 상세로 돌아온다”는 흐름이 자연스럽습니다.
- 다만 `back`만으로는 수정 화면의 스크롤 위치가 그대로 남는 문제가 있어, 상세 화면 쪽에서 1회 refresh와 상단 스크롤을 함께 수행합니다.
- 게시글 삭제는 수정 페이지가 아니라 상세 owner 메뉴에서 수행합니다.

관련 파일:

- `PostForm.tsx`
- `postsDetail/index.tsx`
- `PostOwnerMenu.tsx`
- `navigationRefreshFlag.ts`

### 2. 제품 `detail-edit`

- 일반 상세에서 수정 진입은 `push`
- 저장은 `history back` 우선
- 상세 화면은 `product-detail-refresh:{id}` 플래그를 1회 소비하고 `router.refresh()`
- 직접 진입처럼 `back` 대상이 없을 때만 상세 경로로 `window.location.replace()` fallback 사용
- 취소도 안전한 내부 `returnTo` 문맥이면 `history back` 우선
- 직접 진입처럼 `back` 대상이 없을 때만 `window.location.replace(cancelHref)` fallback 사용
- 현재 `ProductForm`은 저장과 취소 모두 `returnToDetailEditOrigin()`을 거치므로, 취소 back 복귀에서도 상세 refresh 플래그가 기록됨
- 삭제는 수정 페이지가 아니라 상세 owner 메뉴에서 수행

이유:

- 제품 일반 상세는 “상세에서 수정 화면으로 들어갔다가 뒤로가기하면 다시 상세로 돌아가는 흐름”이 더 자연스럽습니다.
- 저장은 기존 상세 히스토리를 재사용하고, 복귀한 상세만 1회 최신화하는 편이 상세/편집 히스토리 중복을 줄이기에 더 적합했습니다.
- 취소도 모바일 퍼스트 기준으로는 back UX가 더 자연스럽고, 직접 진입처럼 안전한 back 대상이 없을 때만 `window.location.replace(cancelHref)` fallback을 사용합니다.
- 삭제는 수정 문맥에서 분리해 상세 owner 메뉴로 이동시키면서 edit/delete 히스토리 꼬임을 줄였습니다.

관련 파일:

- `ProductForm.tsx`
- `ProductDetailActions.tsx`
- `ProductOwnerMenu.tsx`
- [app/(app)/products/view/[id]/edit/page.tsx](<../../app/(app)/products/view/[id]/edit/page.tsx>)

### 3. 제품 `modal-edit`

- 목록에서 인터셉트/패럴렐 라우트 기반 모달 상세 오픈
- 모달 상세에서 수정 진입은 `push`
- 저장/취소는 `history back` 우선
- `history back` 대상이 없는 직접 진입/새로고침 문맥만 `/products?openProductId={id}&returnTo=...` fallback 릴레이 사용
- 모달 상세는 `product-modal-refresh:{id}` 플래그를 1회 소비하고 `router.refresh()`
- 목록 릴레이는 필요할 때만 중간 URL을 `returnTo`로 먼저 정리한 뒤 인터셉트 상세를 다시 `push`
- X/배경/ESC 닫기는 편집 복귀와 분리해 `returnTo` 기반 `router.replace()`로 처리

이유:

- `modal-edit`는 일반 상세 수정이 아니라 “목록 위에 열린 모달 상세를 유지하는 흐름”입니다.
- 초기에 `replace + reopen relay`를 기본 전략으로 사용했지만, 이 방식은 목록/상세 엔트리 중복을 만들기 쉬웠습니다.
- 현재는 `back` 기반 복귀를 기본 정책으로 두고, 브라우저 히스토리가 없는 경우만 릴레이를 fallback으로 사용합니다.
- 모달 수정의 취소는 풀페이지 상세 취소와 달리 수정 화면 엔트리를 상세 모달 엔트리로 되돌리는 동작이므로 `back`이 더 자연스럽습니다.
- 반면 단순 닫기는 채팅 왕복 후 이전 채팅 히스토리를 다시 탈 수 있어 명시적인 `returnTo` 복귀가 더 안전합니다.

관련 파일:

- `ProductForm.tsx`
- `ProductDetailModalContainer.tsx`
- `ProductModalReopenRelay.tsx`
- `ProductDetailActions.tsx`
- `navigationRefreshFlag.ts`

### 4. 풀페이지 상세 삭제

- 게시글 / 제품 일반 상세 / 녹화 상세 삭제는 목록 또는 채널 문맥으로 진입했으면 `history back`을 우선 사용
- 게시글 목록(`/posts`), 제품 목록(`/products`), 내 판매 목록(`/profile/my-sales`)은 App Router back 복귀 시 상세 트리가 함께 복원되는 예외가 있어 `window.location.reload()`로 현재 엔트리를 다시 로드
- 녹화 목록/채널은 기존 refresh 플래그를 1회 소비하고 `router.refresh()`로 stale 화면만 보정
- 직접 진입처럼 안전한 `back` 대상이 없을 때만 `router.replace(returnTo)` fallback 사용
- 제품 모달 상세 삭제는 기존처럼 `back` 우선 정책 유지

여기서 mixed tree는 목록 URL로 복귀했지만 App Router의 메모리상 라우터 트리에 상세/모달 문맥이 일부 함께 복원되는 상태를 의미합니다.

이유:

- `router.replace(returnTo)`만 사용하면 현재 상세 엔트리는 목록으로 바뀌지만, 이전 목록 엔트리가 그대로 남아서 뒤로가기에 같은 목록이 한 번 더 나타납니다.
- 모바일 퍼스트 기준에서는 뒤로가기 UX가 앞으로가기 UX보다 중요하므로, forward history에 삭제된 상세가 남는 trade-off를 수용하고 `back`을 기본 정책으로 유지합니다.
- `router.refresh()`는 브라우저 히스토리를 정리하지는 않지만, back 복귀 직후 stale list를 보정하는 수준에서는 충분합니다.

#### 4.1 게시글 삭제 후 mixed tree 사례

게시글 상세에서 삭제 후 `/posts` 목록으로 복귀하는 과정에서 App Router mixed tree 문제가 확인됐습니다.

증상:

- URL은 `/posts`로 바뀌었지만 화면 상단에 삭제된 게시글 상세 segment가 그대로 남음
- 스크롤을 내리면 그 아래에 게시글 목록이 함께 렌더링됨
- 새로고침해야 정상적인 `/posts` 목록 화면으로 돌아옴
- 다른 페이지로 이동해도 삭제된 상세 UI가 상단에 남는 경우 발생

원인:

`router.refresh()`는 서버 데이터를 다시 가져오지만, 메모리상의 라우터 트리 구조 자체를 재구성하지는 않습니다. `router.back()`으로 `/posts`로 복귀해도 App Router가 이전 상세 segment를 트리에서 제거하지 않은 채 목록을 함께 렌더링하면서 mixed tree 상태가 발생했습니다.

즉 이 문제는 단순 데이터 stale 문제가 아니라 **라우터 트리 자체가 꼬인 mixed tree 상태**였습니다.

해결:

- `PostListRefreshRelay`에서 `router.refresh()` 대신 `window.location.reload()`를 사용해 전체 문서를 재요청하고 라우터 트리를 초기화
- TanStack Query의 게시글 목록 infinite cache에서 삭제된 post id를 즉시 제거
- 삭제된 post id가 `nextCursor`로 남아 있으면 다음 페이지 요청이 깨질 수 있으므로 cursor도 함께 보정
- 삭제된 게시글 상세/좋아요 query cache를 제거하고 posts query를 invalidate

`window.location.reload()`를 선택한 이유:

`router.refresh()`는 SPA 방식으로 서버 데이터만 갱신합니다. 반면 `window.location.reload()`는 브라우저가 전체 문서를 새로 요청하면서 메모리의 라우터 트리를 처음부터 다시 구성합니다. mixed tree 잔상을 제거하는 데 가장 확실한 방법이지만, SPA 상태 전체가 초기화되는 비용도 있습니다. 삭제 직후 목록 복귀라는 문맥에서는 이 비용이 허용 가능하다고 판단했습니다.

cursor 보정이 필요했던 이유:

무한스크롤은 이전 페이지의 마지막 항목 id를 `nextCursor`로 사용합니다. 삭제된 post id가 cursor로 남아 있으면 다음 페이지 요청에서 존재하지 않는 기준점을 참조하게 됩니다. 그래서 cache에서 항목 제거와 동시에 cursor도 보정했습니다.

이 문제의 범위:

녹화 목록/채널은 `router.refresh()`로 stale 보정만 해도 충분했습니다. 반면 게시글 목록(`/posts`), 제품 목록(`/products`), 내 판매 목록(`/profile/my-sales`)은 mixed tree 잔상이 재현되어 `window.location.reload()`를 사용합니다.

관련 파일:

- `PostOwnerMenu.tsx`
- `PostListRefreshRelay.tsx`
- `features/post/service/post.ts`
- `lib/queryKeys.ts`

### 5. 삭제된 상세 재진입 방어

삭제 후 `router.back()`을 기본 정책으로 사용하면 forward history에 삭제된 상세 엔트리가 남습니다.

따라서 게시글 / 제품 / 녹화 상세 페이지는 삭제된 리소스 또는 존재하지 않는 리소스에 대해 반드시 서버에서 방어해야 합니다.

- 존재하지 않음: `notFound()`
- 삭제 상태를 별도로 유지하는 경우: tombstone 안내 또는 목록/채널 redirect
- 권한 변경으로 접근 불가: 403 또는 접근 안내 페이지

현재 BoardPort 구현은 기본적으로 존재하지 않는 상세에 대해 서버에서 `notFound()`를 반환합니다.

현재 게시글 / 제품 / 녹화 삭제는 hard delete 기준입니다. 따라서 존재하지 않는 상세에 대한 `notFound()` 방어로 충분합니다.
단, 이후 soft delete나 `deleted_at` 상태를 유지하는 도메인을 도입하면 상세 조회 단계에서 삭제 상태를 별도로 검사해야 합니다.

- 게시글 상세: [app/(app)/posts/[id]/page.tsx](<../../app/(app)/posts/[id]/page.tsx>)
- 제품 상세: [app/(app)/products/view/[id]/page.tsx](<../../app/(app)/products/view/[id]/page.tsx>)
- 녹화 상세: [app/(app)/streams/[id]/recording/page.tsx](<../../app/(app)/streams/[id]/recording/page.tsx>)

이 방어는 브라우저 forward, 직접 URL 입력, 공유 링크 접근, 새로고침 모두를 커버하기 위한 필수 조건입니다.

### 6. 안전한 `back` 대상 판별 기준

BoardPort에서 `router.back()`은 단순히 `window.history.length > 1`만으로 결정하지 않습니다.

안전한 `back` 대상으로 판단하는 기준은 다음과 같습니다.

- 상세/수정 진입 시 `returnTo`가 내부 경로로 전달된 경우
- modal-edit처럼 앱 내부 relay state가 확인되는 경우
- 그 상태에서 브라우저 히스토리가 실제로 존재하는 경우

즉, 현재 구현의 기준은 **명시적 내부 `returnTo` 문맥 + 브라우저 히스토리 존재 여부**의 조합입니다.

그 외에는 도메인별 fallback을 사용합니다. 제품 일반 상세 편집처럼 App Router stale tree를 피해야 하는 경우에는 `window.location.replace(fallbackPath)`를 사용하고, 단순 명시 경로 복귀는 `router.replace(fallbackPath)`를 사용합니다.

관련 파일:

- `PostOwnerMenu.tsx`
- `PostListRefreshRelay.tsx`
- `ProductOwnerMenu.tsx`
- `ProductListRefreshRelay.tsx`
- `ProductModalReopenRelay.tsx`
- `RecordingTopbar.tsx`
- `RecordingListRefreshRelay.tsx`

## 왜 모두 같은 방식으로 가지 않았는가

처음에는 아래 전략을 공통 해법처럼 봤습니다.

1. 수정 저장
2. `router.back()`
3. 복귀 화면에서 플래그 소비 후 `router.refresh()`

하지만 실제로는 도메인마다 충돌 지점이 달랐습니다.

### 게시글

- 상세 복귀의 자연스러움이 중요
- 수정 화면을 `push`로 열어도 히스토리 부담이 상대적으로 작음
- 대신 스크롤 문맥 전파를 별도로 보정해야 함

### 제품 일반 상세

- 상세가 한 번 더 쌓이는 문제를 줄이기 위해 처음에는 `replace` 기반 편집 진입/복귀도 검토했습니다.
- 하지만 현재 구현은 일반 상세 수정 진입은 `push`, 저장 복귀는 `history back`을 기본으로 사용합니다.
- 상세 화면은 `product-detail-refresh:{id}` 플래그를 1회 소비해 `router.refresh()`를 수행합니다.
- 취소도 현재 구현에서는 저장과 같은 `returnToDetailEditOrigin()` 경로를 사용합니다. 안전한 내부 `returnTo`와 브라우저 히스토리가 있으면 `back`, 직접 진입 fallback은 `window.location.replace(cancelHref)`입니다.

### 제품 모달 상세

- 인터셉트/패럴렐 라우트 때문에 “상세 복귀”가 아니라 “목록 위 모달 유지”로 봐야 함
- `replace + relay`를 기본으로 쓰면 목록/모달 히스토리가 교차로 중복되기 쉬움
- 그래서 현재는 `back 우선 + relay fallback` 정책으로 바뀜

## `returnTo` 안전 규칙

`returnTo`는 외부 URL redirect에 사용하지 않습니다.

모든 `returnTo`는 `sanitizeCallbackUrl()`를 거친 뒤 사용합니다.

현재 구현은 로그인 callback 검증 유틸인 `sanitizeCallbackUrl()`을 재사용하고 있지만, 의미상으로는 `returnTo` 정규화 유틸로도 사용하고 있습니다.
추후 필요하면 `sanitizeInternalPath()` 또는 `sanitizeReturnTo()`처럼 더 범용적인 이름으로 분리할 수 있습니다.

현재 규칙:

- 허용: `/`로 시작하는 내부 경로
- fallback 대체: 빈 값, 파싱 실패
- 차단 후 fallback 대체: `https://...`, `http://...`, `//...`, 내부 경로가 아닌 값
- 방어: `decodeURIComponent()` 이후에도 다시 한 번 절대 URL / 네트워크 경로 여부를 검사

즉, `returnTo`는 “복귀 목적지”이지만, 신뢰할 수 없는 외부 입력으로 간주하고 항상 내부 경로 기준으로 정규화합니다.

## `navigationRefreshFlag`의 현재 역할

공통 유틸:

- `navigationRefreshFlag.ts`

역할:

- 복귀 직후 대상 화면을 1회 재동기화하도록 만드는 단발성 신호 전달
- 현재 refresh flag는 `sessionStorage` 기반이며, 같은 탭의 navigation 복귀 보정만 목적으로 합니다.
- `returnTo`를 대체하지 않음
- 히스토리 정책을 결정하지 않음

즉 이 유틸은:

> “어디로 돌아갈지”를 정하는 도구가 아니라
> “돌아간 화면에서 서버 컴포넌트 payload를 다시 요청하거나, 도메인별 예외에서는 현재 문서를 다시 로드해 라우터 트리를 초기화할지”를 정하는 도구

입니다.

## 현재 적용 범위

### 사용 중

- 게시글 상세 수정 저장 후 상세 복귀
  - `post-detail-refresh:{id}`
- 제품 일반 상세 수정 저장 후 상세 복귀
  - `product-detail-refresh:{id}`
- 제품 모달 상세 수정 저장 후 모달 재오픈
  - `product-modal-refresh:{id}`
- 제품 일반 상세 삭제/숨김 후 내 판매 목록 복귀
  - `my-sales-refresh:root`
- 제품 모달 상세 삭제 후 제품 목록 복귀
  - `products-list-refresh:root`
- 게시글 상세 삭제 후 목록 복귀
  - `posts-list-refresh:root`
- 제품 일반 상세 삭제 후 목록 복귀
  - `products-list-refresh:root`
- 녹화 상세 삭제 후 목록/채널/내 프로필 복귀
  - `recording-list-refresh:{sanitizedCurrentHref}`

권장 방향:

- 가능하면 refresh flag key에는 전체 URL보다 안정적인 scope key를 우선 사용합니다.
- 예: `recording-list-refresh:list`, `recording-list-refresh:channel:{streamId}`, `recording-list-refresh:owner:{ownerId}`
- 현재 구현처럼 전체 href를 사용할 때는 정규화된 내부 경로(`sanitizedCurrentHref`)를 기준으로 사용합니다.
- 단, key 충돌과 디버깅 혼선을 줄이기 위해 전체 href를 key에 포함할 때는 `encodeURIComponent()` 또는 별도 serializer를 거친 값을 사용하는 편이 바람직합니다.

### 사용하지 않는 곳

- 로그인 / 회원가입 / 인증 완료 흐름
- 단순 설정 저장
- 명시 URL `replace`가 더 자연스러운 일반 완료 화면

## 정리

현재 구현은 아래 기준을 따릅니다.

기본 원칙:

1. 수정 저장은 기존 상세/모달 문맥을 재사용한다.
2. 삭제는 목록/채널 문맥으로 복귀한다.
3. `returnTo`는 복귀 목적지, `navigationRefreshFlag`는 복귀 후 1회 재동기화 신호다.
   단, `/posts`, `/products`, `/profile/my-sales`는 mixed tree 예외 때문에 현재 엔트리 `window.location.reload()`를 사용한다.
4. `back`을 쓰는 경우 삭제된 forward 엔트리 재진입은 서버에서 방어한다.
5. fallback은 도메인별 라우터 트리 위험에 맞춘다. 제품 일반 상세 편집 fallback은 `window.location.replace()`, 그 외 단순 명시 복귀는 `router.replace()`를 사용한다.

예외:

1. 게시글 `detail-edit`는 `push + back + detail refresh + scroll reset`
2. 제품 `detail-edit`는 `push + back + detail refresh`, 취소도 안전한 내부 문맥이면 `back` 우선
3. 제품 `modal-edit`는 `push + back`이 기본이고, `ProductModalReopenRelay`는 모달 재오픈 fallback만 담당한다.
4. 풀페이지 상세 삭제는 모바일 퍼스트 기준으로 `back + refresh flag`가 기본
5. 게시글 목록 mixed tree 정리는 `PostListRefreshRelay`가 담당한다.
6. 제품 목록 mixed tree 정리는 `ProductListRefreshRelay`, 내 판매 mixed tree 정리는 `MySalesRefreshRelay`가 담당한다.

수정 복귀 정책은 공통 규칙 하나로 통일하기보다, **도메인/진입 방식별 요구사항에 맞춰 분리한 상태**로 보는 편이 맞습니다.
