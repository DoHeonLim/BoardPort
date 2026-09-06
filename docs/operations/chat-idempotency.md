# 상품 채팅 동시성·멱등성 운영 기준

상품 채팅은 Vercel 인스턴스가 여러 개여도 상품·구매 문의자별 채팅방 하나, 클라이언트 전송 요청별 메시지 하나, 채팅방별 대기 약속 하나로 수렴해야 합니다.

## 저장 규칙

- `ProductChatRoom(productId, buyerId)` 고유 키가 같은 상품과 구매 문의자의 중복 채팅방 생성을 막습니다.
- `ProductMessage(userId, clientMessageId)` 고유 키가 네트워크 재시도에 의한 동일 메시지 중복 저장을 막습니다.
- `Appointment(chatRoomId) WHERE status = 'PENDING'` partial unique index가 채팅방별 대기 중인 약속을 하나로 제한합니다.
- 시스템 메시지는 `clientMessageId`가 `null`이므로 기존 서버 생성 흐름을 유지합니다.

인메모리 잠금은 한 Node.js 프로세스 안에서만 유효하므로 서버리스 인스턴스 간 경쟁을 막는 기준으로 사용하지 않습니다. 채팅방 생성은 DB `upsert`, 메시지 저장은 클라이언트 요청 ID 조회와 고유 제약으로 수렴시킵니다.

## 커밋 이후 외부 전달

메시지·약속 상태와 채팅방 최신 시각은 DB transaction에서 함께 저장합니다. Realtime Broadcast와 알림·Push는 commit 뒤에 실행하며, 외부 전달 실패를 이미 저장된 DB 작업의 실패로 반환하지 않습니다. 클라이언트는 재조회로 최종 상태를 복구할 수 있습니다.

## Migration 동작

`20260826200000_add_chat_idempotency` migration은 다음 순서로 기존 데이터를 정리합니다.

1. 채팅방 참여자·메시지·약속 기록에서 구매 문의자 `buyerId`를 복원합니다.
2. 참여자·메시지·약속 어디에도 구매 문의자 흔적이 없는 빈 legacy 방과 연결 알림을 정리합니다.
3. 동일 상품·구매 문의자의 중복 채팅방을 가장 오래된 방으로 병합합니다.
4. 메시지와 약속, 참여자, 알림 링크를 기준 채팅방으로 옮깁니다.
5. 한 채팅방에 여러 `PENDING` 약속이 있으면 최신 제안만 남기고 이전 제안을 취소합니다.
6. 채팅방·메시지·대기 약속 고유 제약을 생성합니다.

중복 방 병합표는 migration 문장별 commit과 연결 풀 환경에서도 유지되도록 일반 staging table로 만들고 병합 직후 명시적으로 삭제합니다. 컬럼 추가는 `IF NOT EXISTS`로 작성해 중간 실패를 `migrate resolve --rolled-back`으로 복구한 뒤 안전하게 재실행할 수 있습니다.

## 검증과 배포 순서

1. 로컬 PostgreSQL 16에서 `npm run test:migration:chat-idempotency`를 실행합니다.
2. Vitest, 타입 검사, lint, production build를 확인합니다.
3. 운영 DB에 `npx prisma migrate deploy`를 적용합니다.
4. 새 애플리케이션을 배포합니다.
5. 동일 상품 채팅방 재진입, 메시지 전송, 약속 재제안을 smoke test합니다.

Migration 통합 테스트는 테이블을 생성·삭제하므로 `localhost`의 `boardport_migration_test` 전용 DB만 허용합니다. 운영 Supabase URL로는 실행되지 않습니다.
