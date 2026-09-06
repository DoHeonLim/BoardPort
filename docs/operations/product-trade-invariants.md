# 상품 거래 상태 불변식 운영 가이드

## 목적

상품의 판매중·예약중·판매완료 상태를 별도 enum 없이 예약자/구매자와 처리 시각으로 표현하므로, 애플리케이션의 동시 요청과 직접 SQL 모두 같은 규칙을 지켜야 합니다.

## 상태 규칙

- 판매중: 예약자·예약 시각·구매자·구매 시각이 모두 `NULL`
- 예약중: 예약자와 예약 시각만 함께 존재
- 판매완료: 구매자와 구매 시각만 함께 존재
- 예약자와 구매자는 동시에 존재할 수 없음
- 판매자 본인은 예약자나 구매자가 될 수 없음

서비스는 선조회한 상대방 ID와 시각을 `updateMany` 조건에 다시 넣어, 관찰한 거래 상태가 유지될 때만 변경하는 조건부 갱신 방식을 사용합니다. 조회 이후 다른 요청이 상태를 바꾸면 갱신 건수가 0이 되어 중복 또는 오래된 요청을 거부합니다.

DB migration은 legacy 행을 먼저 정규화한 뒤 CHECK constraint를 추가합니다. 예약자·구매자 계정 삭제로 외래 키가 `NULL`이 될 때 대응 시각도 함께 비우도록 trigger를 사용합니다.

## 로컬 PostgreSQL 검증

일회용 PostgreSQL 16 컨테이너의 생성·준비 확인·정리를 포함한 단축 명령을 실행합니다.

```bash
npm run test:migration:docker -- product-trade
```

이 테스트는 legacy 상태 정규화, 거래 상대 배타성, ID·시각 쌍, 판매자 본인 제외, 사용자 삭제 시 시각 정리를 실제 PostgreSQL 16에서 확인합니다.

Docker 자동화의 전체 동작과 문제 해결 방법은 [`database-deployment-runbook.md`](./database-deployment-runbook.md#2-로컬-docker-migration-통합-테스트)를 따릅니다.

## 배포 확인

운영 배포 전후에는 다음 순서로 확인합니다.

1. `npx prisma migrate status`
2. 미적용 migration이 이 작업 하나인지 확인
3. `npx prisma migrate deploy`
4. `npx prisma migrate status`에서 `Database schema is up to date!` 확인
5. 예약 → 판매완료, 예약 취소 → 판매중 복귀 스모크 테스트 수행
