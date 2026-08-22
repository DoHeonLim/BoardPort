-- Keep the Realtime authorization helper outside the Data API's public schema.
-- authenticated receives schema USAGE and function EXECUTE only; application
-- tables in public remain inaccessible after the preceding migration.

CREATE SCHEMA IF NOT EXISTS boardport_private;
REVOKE ALL ON SCHEMA boardport_private FROM PUBLIC;

ALTER FUNCTION public.boardport_realtime_can_read_topic(text)
  SET SCHEMA boardport_private;

REVOKE ALL ON FUNCTION boardport_private.boardport_realtime_can_read_topic(text)
  FROM PUBLIC;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON SCHEMA boardport_private TO authenticated;
    GRANT EXECUTE ON FUNCTION boardport_private.boardport_realtime_can_read_topic(text)
      TO authenticated;
  END IF;
END;
$migration$;
