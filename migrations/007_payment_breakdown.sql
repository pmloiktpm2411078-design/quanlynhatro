-- Tách số tiền đã thu theo từng loại: tiền thuê, điện, nước và khoản khác.
ALTER TABLE payment_records
  ADD COLUMN rent_paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER other_amount,
  ADD COLUMN electricity_paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER rent_paid_amount,
  ADD COLUMN water_paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER electricity_paid_amount,
  ADD COLUMN other_paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER water_paid_amount;

-- Phân bổ các khoản thu cũ theo thứ tự tiền thuê, điện, nước, khoản khác.
UPDATE payment_records
SET rent_paid_amount = LEAST(paid_amount, rent_amount),
    electricity_paid_amount = LEAST(GREATEST(paid_amount - rent_amount, 0), electricity_amount),
    water_paid_amount = LEAST(GREATEST(paid_amount - rent_amount - electricity_amount, 0), water_amount),
    other_paid_amount = LEAST(GREATEST(paid_amount - rent_amount - electricity_amount - water_amount, 0), other_amount);
