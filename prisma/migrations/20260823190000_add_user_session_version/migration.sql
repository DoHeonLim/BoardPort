-- Password changes increment this value so previously issued cookie sessions
-- no longer match the user's current authentication state.
ALTER TABLE "User"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1;
