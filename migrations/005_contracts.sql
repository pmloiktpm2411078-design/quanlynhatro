-- Hợp đồng thuê phòng, liên kết với phòng và hồ sơ khách thuê.
CREATE TABLE IF NOT EXISTS contracts (
  contract_id INT NOT NULL AUTO_INCREMENT,
  contract_code VARCHAR(40) NOT NULL,
  room_id INT NOT NULL,
  tenant_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  monthly_rent DECIMAL(12, 2) NOT NULL,
  deposit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status ENUM('ACTIVE', 'ENDED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (contract_id),
  UNIQUE KEY contracts_code_unique (contract_code),
  KEY contracts_room_status_index (room_id, status),
  KEY contracts_tenant_index (tenant_id),
  CONSTRAINT contracts_room_fk FOREIGN KEY (room_id) REFERENCES rooms (room_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT contracts_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants (tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
