-- BoardPort Realtime Authorization
-- - Browser clients may only SELECT broadcasts from authorized private topics.
-- - No authenticated INSERT policy is created, so browser-originated broadcasts are denied.
-- - Server broadcasts use SUPABASE_SECRET_KEY and bypass these client RLS policies.

CREATE OR REPLACE FUNCTION public.boardport_realtime_can_read_topic(requested_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  claims jsonb;
  viewer_id integer;
  stream_room_id integer;
BEGIN
  BEGIN
    claims := COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF COALESCE(claims ->> 'boardport_user_id', '') !~ '^[1-9][0-9]*$' THEN
    RETURN false;
  END IF;
  viewer_id := (claims ->> 'boardport_user_id')::integer;

  -- 사용자 개인 알림과 채팅방 목록 갱신 topic
  IF requested_topic = 'user:' || viewer_id::text || ':notifications'
    OR requested_topic = 'user:' || viewer_id::text || ':chat-rooms' THEN
    RETURN true;
  END IF;

  -- 상품 채팅은 Prisma implicit N:M 참여 테이블에 포함된 사용자만 구독 가능
  IF requested_topic ~ '^product-room:[A-Za-z0-9_-]+$' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public."_ProductChatRoomToUser" AS membership
      WHERE membership."A" = substring(
        requested_topic FROM char_length('product-room:') + 1
      )
        AND membership."B" = viewer_id
    );
  END IF;

  -- 방송 목록/상세는 이벤트 payload를 상태로 쓰지 않고 DB 재조회 신호로만 사용
  IF requested_topic = 'stream:status' THEN
    RETURN true;
  END IF;

  IF requested_topic !~ '^stream-room:[1-9][0-9]*$' THEN
    RETURN false;
  END IF;
  stream_room_id := substring(
    requested_topic FROM char_length('stream-room:') + 1
  )::integer;

  RETURN EXISTS (
    SELECT 1
    FROM public."StreamChatRoom" AS room
    JOIN public."Broadcast" AS broadcast ON broadcast."id" = room."broadcastId"
    JOIN public."LiveInput" AS live_input ON live_input."id" = broadcast."liveInputId"
    WHERE room."id" = stream_room_id
      AND (
        live_input."userId" = viewer_id
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public."Block" AS block_relation
            WHERE (
              block_relation."blockerId" = viewer_id
              AND block_relation."blockedId" = live_input."userId"
            ) OR (
              block_relation."blockerId" = live_input."userId"
              AND block_relation."blockedId" = viewer_id
            )
          )
          AND (
            broadcast."visibility"::text = 'PUBLIC'
            OR (
              broadcast."visibility"::text = 'FOLLOWERS'
              AND EXISTS (
                SELECT 1
                FROM public."Follow" AS follow_relation
                WHERE follow_relation."followerId" = viewer_id
                  AND follow_relation."followingId" = live_input."userId"
              )
            )
            OR (
              broadcast."visibility"::text = 'PRIVATE'
              AND jsonb_typeof(claims -> 'unlocked_broadcast_ids') = 'array'
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(
                  claims -> 'unlocked_broadcast_ids'
                ) AS unlocked(value)
                WHERE unlocked.value = broadcast."id"::text
              )
            )
          )
        )
      )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.boardport_realtime_can_read_topic(text) FROM PUBLIC;

DO $migration$
BEGIN
  -- BoardPort는 Supabase Data API를 사용하지 않는다. Realtime JWT의 authenticated
  -- role이 Prisma application table까지 읽거나 쓰지 못하도록 public data 권한을 제거한다.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon';
  END IF;

  -- 일반 PostgreSQL/Prisma shadow DB에는 Supabase 전용 role/schema가 없을 수 있다.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated';
    GRANT EXECUTE ON FUNCTION public.boardport_realtime_can_read_topic(text)
      TO authenticated;
  END IF;

  IF to_regclass('realtime.messages') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'Skipping Supabase Realtime policy outside a Supabase database';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "BoardPort authorized private broadcasts" ON realtime.messages';
  EXECUTE $policy$
    CREATE POLICY "BoardPort authorized private broadcasts"
    ON realtime.messages
    FOR SELECT
    TO authenticated
    USING (
      realtime.messages.extension = 'broadcast'
      AND public.boardport_realtime_can_read_topic(realtime.topic())
    )
  $policy$;
END;
$migration$;
