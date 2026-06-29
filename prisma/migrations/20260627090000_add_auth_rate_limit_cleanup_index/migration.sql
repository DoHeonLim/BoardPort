-- Optimize stale auth rate limit event cleanup by policy kind.
CREATE INDEX "AuthRateLimitEvent_kind_created_at_idx" ON "AuthRateLimitEvent"("kind", "created_at");
