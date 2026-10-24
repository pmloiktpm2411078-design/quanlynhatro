-- Chỉ số đồng hồ và đơn giá điện/nước cho từng kỳ thu tiền.
ALTER TABLE payment_records
  ADD COLUMN electricity_previous_reading DECIMAL(12, 3) NOT NULL DEFAULT 0 AFTER electricity_amount,
  ADD COLUMN electricity_current_reading DECIMAL(12, 3) NOT NULL DEFAULT 0 AFTER electricity_previous_reading,
  ADD COLUMN electricity_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER electricity_current_reading,
  ADD COLUMN water_previous_reading DECIMAL(12, 3) NOT NULL DEFAULT 0 AFTER water_amount,
  ADD COLUMN water_current_reading DECIMAL(12, 3) NOT NULL DEFAULT 0 AFTER water_previous_reading,
  ADD COLUMN water_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER water_current_reading;
