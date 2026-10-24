-- Add a verified email address to each account before enabling email OTP.
ALTER TABLE users
  ADD COLUMN email VARCHAR(254) NULL;

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE password_reset_otps (
  username VARCHAR(191) NOT NULL PRIMARY KEY,
  otp_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  sent_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0
);
