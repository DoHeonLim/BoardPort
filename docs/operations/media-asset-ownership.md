# MediaAsset 소유권 관리 운영 가이드

<!--
File Name : docs/operations/media-asset-ownership.md
Description : Cloudflare Images 소유권 관리 배포·backfill·orphan·OG fetch 운영 절차
Author : 임도헌

History
Date        Author   Status    Description
2026.08.22  임도헌   Created   MediaAsset 배포 순서와 안전한 OG 이미지 처리 경계 정리
-->

## 목적

Cloudflare Images direct upload URL 자체는 일회성이지만, 발급된 이미지 ID를 클라이언트가 임의 콘텐츠에 전달할 수 있다. BoardPort는 `MediaAsset`에서 이미지 소유권을 관리해 발급 사용자, 업로드 용도, 연결 콘텐츠를 검증한다.

## 상태 전이

- `PENDING`: direct upload URL 발급 완료, 콘텐츠에는 아직 연결되지 않음
- `ATTACHED`: 소유자·용도 검증을 통과해 하나의 BoardPort entity에 연결됨
- `ORPHANED`: 수정 과정에서 콘텐츠 연결이 제거되어 원격 삭제 대상이 됨
- `DELETED`: Cloudflare Images 삭제가 성공했거나 이미 존재하지 않음

같은 자산은 조건부 DB 갱신으로 한 entity만 선점할 수 있다. 클라이언트 URL에서 추출한 ID만으로 삭제하지 않고, DB에서 조회한 provider ID만 Cloudflare API에 전달한다.

## 배포 순서

1. 배포 전 migration을 적용해 기존 Cloudflare Images URL을 `MediaAsset`에 backfill한다.
2. backfill 결과에서 목적별 수량과 충돌 누락을 확인한다.
3. 새 애플리케이션 버전을 배포한다.
4. 상품·게시글·채팅·아바타·방송 썸네일을 각각 한 번 업로드해 정상 연결을 확인한다.

운영 DB migration 명령은 저장소 루트에서 다음과 같이 실행한다.

```bash
npx prisma migrate deploy
```

실행 전 `DIRECT_URL`이 의도한 운영 DB인지 반드시 확인한다.

## Backfill 감사

동일 provider ID가 여러 기존 콘텐츠 URL에서 재사용된 경우 unique 제약으로 최초 한 건만 `MediaAsset`에 들어간다. 아래 쿼리로 실제 콘텐츠 URL 수와 `MediaAsset` 저장 수 차이를 확인하고, 차이가 있으면 배포 전에 원본 콘텐츠를 검토한다.

```sql
select "purpose", count(*)
from "MediaAsset"
group by "purpose"
order by "purpose";
```

Cloudflare가 아닌 GitHub OAuth 아바타 등 외부 프로필 이미지는 backfill 대상이 아니다. 기존 값은 변경하지 않는 편집에서만 유지되며, 새 사용자 업로드는 반드시 현재 Cloudflare 계정에 속하고 `MediaAsset`에 등록된 자산이어야 한다.

## 미연결 업로드 정책

Direct upload URL은 30분으로 발급하고 `expires_at`에도 같은 시각을 기록한다. 폼 이탈이나 저장 실패로 남은 `PENDING` 행과 실제 업로드 자산은 후속 정리 대상으로 취급한다. 정리 시에는 반드시 `state = 'PENDING' AND expires_at < now()` 조건으로 provider ID를 읽고, Cloudflare 삭제 성공 뒤 `DELETED`로 전환한다. `ATTACHED` 자산을 만료 시각만으로 삭제하면 안 된다.

## OG 이미지 조회 경계

동적 OG 이미지는 다음 조건을 모두 만족할 때만 원격 이미지를 사용한다.

- HTTPS와 계정별 Cloudflare host allowlist
- DNS 결과의 loopback/private/link-local 차단
- redirect 2회, 요청당 3초 제한
- 이미지 MIME만 허용, 최대 5 MiB
- Sharp 입력 최대 2천만 pixel

어느 조건이든 실패하면 route 오류 대신 텍스트 중심 기본 OG 이미지로 폴백한다.
