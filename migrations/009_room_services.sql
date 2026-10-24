-- Phiếu ghi nhận và theo dõi sự cố, sửa chữa trong phòng.
CREATE TABLE IF NOT EXISTS room_services (
  service_id INT NOT NULL AUTO_INCREMENT,
  room_id INT NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Khác',
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  priority ENUM('LOW', 'NORMAL', 'HIGH') NOT NULL DEFAULT 'NORMAL',
  status ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  reported_date DATE NOT NULL,
  cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  resolution_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (service_id),
  KEY room_services_room_index (room_id),
  KEY room_services_status_index (status),
  CONSTRAINT room_services_room_fk FOREIGN KEY (room_id) REFERENCES rooms (room_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
