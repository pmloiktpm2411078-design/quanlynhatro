-- Tenant records used by the /api/tenants endpoints.
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id INT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  date_of_birth DATE NOT NULL,
  identity_number VARCHAR(20) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  contact_info VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id),
  UNIQUE KEY tenants_identity_number_unique (identity_number),
  KEY tenants_full_name_index (full_name),
  KEY tenants_phone_index (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
