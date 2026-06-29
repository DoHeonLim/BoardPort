-- SMS login tokens should not reserve User.phone before verification succeeds.
ALTER TABLE "SMSToken" ALTER COLUMN "userId" DROP NOT NULL;
