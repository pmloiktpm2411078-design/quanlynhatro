-- Create normalized room types and retain existing room categories.
-- Run this migration once after backing up the database.

CREATE TABLE room_types (
  room_type_id INT NOT NULL AUTO_INCREMENT,
  type_code VARCHAR(30) NOT NULL,
  type_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (room_type_id),
  UNIQUE KEY room_types_type_code_unique (type_code),
  UNIQUE KEY room_types_type_name_unique (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO room_types (type_code, type_name)
VALUES
  ('VIP', 'Phòng VIP'),
  ('STANDARD', 'Phòng Tiêu chuẩn'),
  ('BUDGET', 'Phòng Giá rẻ');

ALTER TABLE rooms
  ADD COLUMN room_type_id INT NULL AFTER room_number,
  ADD COLUMN description TEXT NULL AFTER status,
  ADD KEY rooms_room_type_id_index (room_type_id),
  ADD CONSTRAINT rooms_room_type_id_fk
    FOREIGN KEY (room_type_id)
    REFERENCES room_types (room_type_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

UPDATE rooms AS r
JOIN room_types AS rt ON rt.type_name = r.type_name
SET r.room_type_id = rt.room_type_id;
