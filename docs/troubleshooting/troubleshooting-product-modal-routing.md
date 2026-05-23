# 제품 상세 모달/편집 라우팅 트러블슈팅

## 문제 요약

여기서는 제품 상세의 Intercepting Route / Parallel Route 기반 모달 라우팅 문제를 다룹니다. 게시글, 제품, 녹화본 전반의 수정/삭제 후 복귀 정책은 [Navigation Refresh Flag](./troubleshooting-navigation-refresh-flag.md)를 기준으로 봅니다.

BoardPort의 제품 상세는 동일한 URL(`/products/view/[id]`)을 두 가지 방식으로 처리합니다.

1. 목록에서 진입하면 Intercepting Route가 가로채 **모달 상세**
2. 직접 URL 진입이나 새로고침이면 **일반 상세 페이지**

**Before:** 모달에서 수정 후 저장하면 404가 발생하거나, 뒤로가기에서 목록/상세 히스토리가 중복되는 문제가 반복됐습니다.

**After:** `back 우선 + relay fallback` 정책으로 기본 흐름의 히스토리 중복을 줄이고, 모달/상세 문맥별 복귀 기준을 분리했습니다.

이 구조에서 `상세 -> 수정 -> 저장/취소/삭제 -> 복귀` 흐름을 처리하는 과정에서 다음 문제가 반복됐습니다.

- 수정 완료 후 404
- 모달/목록 히스토리 중복
- 뒤로가기 시 상세와 목록이 번갈아 한 번 더 나타나는 문제
- 수정 직후 복귀 화면의 stale 데이터

초기 해결안은 `replace + reopen relay` 중심이었지만, 실제 테스트를 거치면서 이 전략이 모든 문맥에 맞지 않는다는 점이 드러났습니다.

## 1. 핵심 증상

### 1.1 저장 후 404

수정 완료 후 `/products/view/[id]`로 돌아갈 때 404가 재현됐습니다.
같은 URL을 새로고침하면 정상 렌더링됐습니다.

### 1.2 모달 닫기 불안정

`router.back()` 기반 닫기에서 다음 문제가 발생했습니다.

- 모달이 닫히지 않음
- 뒤로가기를 여러 번 해야 목록으로 복귀
- 수정 후 복귀 위치가 모달/페이지 문맥에 따라 섞임

### 1.3 히스토리 중복

특히 아래 흐름에서 중복이 명확했습니다.

- `products -> modal detail -> edit -> save -> products -> modal detail`
- 뒤로가기를 누르면 `modal detail -> products -> modal detail -> products` 식으로 중복 순환

즉, 404만 해결한다고 끝나는 문제가 아니라 **히스토리 정책까지 같이 정리해야 하는 문제**였습니다.

## 2. 근본 원인

### 원인 A. Parallel Slot 상태와 URL 해석 충돌

App Router는 soft navigation 상태를 메모리에 유지합니다.
모달 슬롯이 활성화된 상태에서 수정 페이지에 들어가면, 수정 완료 후 같은 상세 URL로 복귀해도 현재 라우터 트리 문맥 안에서 URL을 해석하려고 합니다.

즉:

- URL은 상세 페이지를 가리키는데
- 메모리의 라우터 트리는 모달 슬롯이 살아 있음

이 충돌이 저장 완료 직후 404를 만들었습니다.

### 원인 B. `back()`도, `replace()`도 단독 해법이 아니었음

초기에는 `back()`이 불안정하다고 보고 `replace + relay` 중심으로 정리했지만, 이 방식은 목록/상세 엔트리를 새로 만들면서 히스토리 중복을 만들기 쉬웠습니다.

반대로 `back()`만 고집하면:

- 히스토리 대상이 없는 직접 진입
- 새로고침 뒤 수정 진입

같은 문맥을 처리할 수 없습니다.

즉 문제는 `back()` 자체가 아니라, **어느 문맥에서 `back`을 기본으로 쓰고, 어느 문맥에서 fallback 경로를 써야 하는지 기준이 없었던 것**입니다.

### 원인 C. `returnTo`만으로는 컨텍스트 구분이 불충분

복귀 URL만 알아서는 사용자가:

- 모달에서 수정을 시작했는지
- 일반 상세에서 수정을 시작했는지

를 구분할 수 없습니다.

그래서 `flow=modal-edit | detail-edit` 같은 문맥 정보가 별도로 필요했습니다.

## 3. 현재 해결 전략

현재 코드는 아래 원칙으로 정리합니다.

### 전략 1. 일반 상세와 모달 상세를 같은 수정 정책으로 묶지 않기

- 일반 상세 수정은 `push + back + detail refresh` 기반
- 모달 상세 수정은 `push + back + modal refresh` 기반

두 흐름의 요구사항이 다르기 때문에 분리합니다.

### 전략 2. 모달 수정은 `back` 우선, 릴레이는 fallback

예전처럼 `replace + relay`를 기본으로 두지 않고:

- 기존 모달 상세 히스토리가 있으면 `router.back()`
- 그 문맥이 없을 때만 `/products?openProductId=...` 중간 URL을 이용해 fallback 재오픈

으로 정리했습니다.

### 전략 3. `navigationRefreshFlag`는 복귀 후 1회 최신화만 담당

`product-modal-refresh:{id}`는:

- 저장 후 어디로 갈지 결정하지 않음
- 복귀한 모달 상세를 1회만 새로고침하는 역할만 담당

즉, 라우팅 정책과 freshness 보정을 분리했습니다.

## 4. 현재 적용한 코드 기준

### 4.1 모달 닫기 정책

관련 파일:

- `ProductDetailModalContainer.tsx`
- `CloseButton.tsx`

현재 정책:

- 닫기 시 기존 목록/모달 히스토리 문맥이 확인되면 `router.back()` 우선
- back 대상이 없을 때만 `router.replace(returnTo)`

의미:

- 기존 목록/모달 문맥이 있으면 재사용
- 직접 진입/새로고침 같은 경우만 안전 경로 fallback

### 4.2 컨텍스트 명시화

관련 파일:

- `ProductDetailModalContainer.tsx`
- `productDetail/index.tsx`
- `ProductOwnerMenu.tsx`

현재 정책:

- `isModalContext` prop 유지
- 수정 링크 생성 시 `flow=modal-edit` 조건부 부여

의미:

- 같은 제품 상세라도 “일반 상세 수정”과 “모달 상세 수정”을 다른 라우팅 전략으로 다룸

### 4.3 수정 진입 전략

관련 파일:

- `ProductOwnerMenu.tsx`
- `ProductDetailModalContainer.tsx`

현재 정책:

- 일반 상세 -> 수정 진입은 `push`
- 모달 상세 -> 수정 진입은 `push`

이유:

- 일반 상세는 저장 후 기존 상세 히스토리로 돌아가는 흐름을 유지해야 함
- 모달 상세는 저장/취소 후 `back` 복귀가 가능해야 함

### 4.4 저장 완료 후 복귀 분기

관련 파일:

- `ProductForm.tsx`

현재 정책:

- `flow=modal-edit`면 `returnToModalEditOrigin()` 호출
  - `back` 가능하면 `router.back()`
  - 아니면 `/products?openProductId={id}&returnTo=...` fallback
- `flow=detail-edit`면 `product-detail-refresh:{id}`를 기록한 뒤 `router.back()`
- 직접 진입처럼 `back` 대상이 없을 때만 일반 상세 경로로 `window.location.replace()` fallback

의미:

- 모달 편집은 기존 모달 히스토리 재사용 우선
- 일반 상세 수정은 기존 상세 히스토리 재사용 + 복귀 후 1회 최신화 우선
- 일반 상세 직접 진입 fallback은 App Router의 stale tree를 피하기 위해 SPA `router.replace()`가 아니라 전체 문서 이동인 `window.location.replace()`를 사용

### 4.5 모달 재오픈 릴레이

관련 파일:

- `ProductModalReopenRelay.tsx`
- `ProductListRefreshRelay.tsx`
- `app/(app)/(tabs)/products/page.tsx`

현재 정책:

- `openProductId`를 감지하면 먼저 `returnTo` 목록 URL로 정리
- 그 다음 틱에 인터셉트 상세를 다시 `push`
- 하지만 이 흐름은 **기본 복귀 경로가 아니라 history back 대상이 없을 때만 쓰는 fallback**
- 제품 목록으로 `back` 복귀한 뒤 mixed tree가 남는 예외는 `ProductListRefreshRelay`가 `products-list-refresh:root`를 소비해 현재 엔트리를 reload한다.

즉:

- 예전: `replace + relay`가 주 경로
- 현재: `back`이 주 경로, `relay`는 보조 경로

## 5. 결과

| 문제 | 해결 결과 |
| --- | --- |
| 저장 후 404 | 라우터 트리 불일치 원인 파악 후 복귀 경로 정리 |
| 히스토리 중복 순환 | `back 우선` 정책으로 기본 목록/모달 엔트리 중복 완화 |
| stale 데이터 복귀 | `navigationRefreshFlag` 1회 소비로 복귀 직후 최신화 |
| 모달 직접 진입/새로고침 문맥 | `ProductModalReopenRelay`가 fallback 재오픈만 담당 |

### 모달에서 수정 시작

- 저장/취소 후 기존 모달 상세로 복귀
- 목록 문맥 유지
- 뒤로가기는 1회면 목록 복귀 가능

### 일반 상세에서 수정 시작

- 저장 후 기존 일반 상세로 복귀
- 상세 화면은 `product-detail-refresh:{id}`를 1회 소비해 최신 데이터로 동기화

### 404 재현

- 저장 후 라우터 트리 불일치로 재현되던 404는 해소

### 히스토리 중복

- 예전 `products -> modal detail -> edit -> products -> modal detail` 식 중복은 크게 줄어듦
- 직접 진입/새로고침 문맥만 fallback 릴레이가 개입

## 6. 이번에 확인한 점

### 6.1 App Router에서 URL과 라우터 트리는 다른 개념이다

Parallel / Intercepting Routes 환경에서는 같은 URL이라도 현재 라우터 트리 상태가 다르면 결과가 달라집니다.
저장 후 404가 발생한 원인도 URL 자체의 문제가 아니라, 메모리의 라우터 트리와 URL이 불일치한 것이었습니다.
App Router를 쓸 때는 “어떤 URL인가”만큼 “어떤 트리 상태인가”를 함께 봐야 합니다.

### 6.2 `back()`과 `replace()`는 문맥별 기본값의 문제다

- `back()`은 기존 히스토리 문맥 복원에 강점
- `replace()`는 엔트리 중복 제거에 강점

하나를 버리는 게 아니라, 히스토리가 있는 문맥과 없는 문맥을 구분해서 기본값을 정하는 것이 핵심이었습니다.
이 기준 없이 두 방식을 섞으면 어느 쪽이든 예외 케이스가 생깁니다.

### 6.3 복귀 URL과 플로우 컨텍스트는 분리해야 함

- `returnTo`: 어디로 돌아갈지
- `flow`: 어떤 문맥에서 시작했는지

처음에는 `returnTo`만으로 복귀 정책을 모두 처리하려 했지만, 모달에서 시작한 수정인지 일반 상세에서 시작한 수정인지를 URL만으로는 구분할 수 없었습니다.
이 두 정보를 분리하고 나서야 수정/복귀 정책이 덜 흔들렸습니다.

### 6.4 릴레이는 주 전략이 아니라 fallback으로 두는 편이 안전함

중간 URL과 모달 재오픈 릴레이는 강력하지만, 기본 흐름으로 쓰면 히스토리 엔트리를 쉽게 늘립니다.
가능한 문맥에서는 기존 히스토리를 재사용하고, 릴레이는 직접 진입/새로고침 같은 예외 경로만 맡기는 편이 더 안정적이었습니다.

## 7. 정리

이 사례는 제품 상세 라우팅 문제를 “404 해결”만으로 보면 부족하다는 점을 보여줍니다.
실제로는 아래 세 가지를 함께 맞춰야 했습니다.

1. Parallel / Intercepting Route의 라우터 트리 정합성
2. 모달/상세/수정 간 히스토리 정책
3. 복귀 직후 stale 데이터의 1회 최신화

현재 코드는 아래 기준으로 맞춰두었습니다.

1. 일반 상세 수정은 `push + back + detail refresh` 기반
2. 모달 상세 수정은 `push + back + modal refresh` 기반
3. `ProductModalReopenRelay`는 모달 재오픈 fallback 전용
4. `product-modal-refresh`는 복귀 후 1회 최신화 전용
5. `ProductListRefreshRelay`는 제품 목록 mixed tree 정리 전용

결국 제품 모달 라우팅은 **`replace + relay`를 기본 전략으로 쓰는 구조가 아니라, `back 우선 + relay fallback` 구조**로 정리됐습니다.

## 8. 함께 보면 좋은 문서

- [수정 복귀 / returnTo / refresh 플래그 정리](./troubleshooting-navigation-refresh-flag.md)
- [상태 관리 아키텍처 현대화](../architecture/case-study-state-management-modernization.md)
- [BoardPort UI/UX 디자인 기준](../design/boardport-uiux-design-standard.md)
