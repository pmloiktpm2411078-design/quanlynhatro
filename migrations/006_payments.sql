-- Khoản thu theo từng hợp đồng và tháng thanh toán.
CREATE TABLE IF NOT EXISTS payment_records (
  payment_id INT NOT NULL AUTO_INCREMENT,
  contract_id INT NOT NULL,
  billing_month DATE NOT NULL,
  rent_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  electricity_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  water_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  other_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  payment_method ENUM('CASH', 'BANK_TRANSFER', 'OTHER') NULL,
  notes VARCHAR(1000) NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY payment_contract_month_unique (contract_id, billing_month),
  KEY payment_month_due_index (billing_month, due_date),
  CONSTRAINT payment_records_contract_fk FOREIGN KEY (contract_id) REFERENCES contracts (contract_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
