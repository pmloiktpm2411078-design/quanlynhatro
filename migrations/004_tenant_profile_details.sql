-- Extend tenant profiles with contact email, gender, and an optional login account link.
ALTER TABLE tenants
  ADD COLUMN email VARCHAR(254) NULL AFTER phone,
  ADD COLUMN gender VARCHAR(20) NULL AFTER email,
  ADD COLUMN user_id INT NULL AFTER gender,
  ADD UNIQUE KEY tenants_user_id_unique (user_id),
  ADD KEY tenants_email_index (email),
  ADD CONSTRAINT tenants_user_id_fk
    FOREIGN KEY (user_id)
    REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
