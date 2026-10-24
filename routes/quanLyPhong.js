const express = require("express");
const router = express.Router();
const SECRET_KEY = "khoa_bi_mat_cua_he_thong_nha_tro";
const db = require("../config/db");
const authMiddleware = require("./xacThuc");

// UC-ROOM-01: Xem danh sách phòng (An toàn, chống văng lỗi SQL)
router.get("/", async (req, res) => {
  console.log("👉 Đã nhận yêu cầu lấy danh sách phòng từ Frontend!");
  try {
    const [rooms] = await db.query("SELECT * FROM rooms");
    return res.status(200).json({
      message: "Lấy danh sách phòng thành công.",
      total: rooms.length,
      data: rooms,
    });
  } catch (error) {
    console.error("=== LỖI CSDL MYSQL ===", error);
    return res.status(500).json({
      message: "Lỗi kết nối cơ sở dữ liệu",
      detail: error.message,
    });
  }
});

// UC-ROOM-03: Lấy thông tin chi tiết một phòng
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const roomId = Number(req.params.id);

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({
        message: "Mã phòng không hợp lệ.",
      });
    }

    const [rooms] = await db.query(
      `SELECT
        r.room_id,
        r.room_code,
        r.room_number,
        r.room_type_id,
        rt.type_code,
        rt.type_name,
        r.area_m2,
        r.listed_rent,
        r.status,
        r.description
      FROM rooms r
      LEFT JOIN room_types rt
        ON r.room_type_id = rt.room_type_id
      WHERE r.room_id = ?`,
      [roomId],
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy phòng.",
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin phòng thành công.",
      data: rooms[0],
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin phòng:", error);

    return res.status(500).json({
      message: "Không thể lấy thông tin phòng.",
    });
  }
});

// UC-ROOM-02: Thêm phòng mới
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      room_code,
      room_number,
      room_type_id,
      area_m2,
      listed_rent,
      description,
    } = req.body;

    if (
      !room_code ||
      !room_number ||
      !room_type_id ||
      listed_rent === undefined ||
      listed_rent === null ||
      listed_rent === ""
    ) {
      return res.status(400).json({
        message:
          "Vui lòng nhập đầy đủ mã phòng, số phòng, loại phòng và giá thuê.",
      });
    }

    const typeId = Number(room_type_id);
    const rent = Number(listed_rent);
    const area =
      area_m2 === "" || area_m2 === null || area_m2 === undefined
        ? null
        : Number(area_m2);

    if (!Number.isInteger(typeId) || typeId <= 0) {
      return res.status(400).json({
        message: "Loại phòng không hợp lệ.",
      });
    }

    if (!Number.isFinite(rent) || rent < 0) {
      return res.status(400).json({
        message: "Giá thuê phải là số không âm.",
      });
    }

    if (area !== null && (!Number.isFinite(area) || area <= 0)) {
      return res.status(400).json({
        message: "Diện tích phải lớn hơn 0.",
      });
    }

    const code = String(room_code).trim();
    const number = String(room_number).trim();

    if (!code || !number) {
      return res.status(400).json({
        message: "Mã phòng và số phòng không được để trống.",
      });
    }

    const [existingRooms] = await db.query(
      `SELECT room_id
       FROM rooms
       WHERE room_code = ? OR room_number = ?`,
      [code, number],
    );

    if (existingRooms.length > 0) {
      return res.status(409).json({
        message: "Mã phòng hoặc số phòng đã tồn tại.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO rooms
       (
         room_code,
         room_number,
         room_type_id,
         area_m2,
         listed_rent,
         status,
         description
       )
       VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?)`,
      [
        code,
        number,
        typeId,
        area,
        rent,
        description ? String(description).trim() : null,
      ],
    );

    return res.status(201).json({
      message: "Thêm phòng thành công!",
      room_id: result.insertId,
    });
  } catch (error) {
    console.error("Lỗi thêm phòng:", error);

    return res.status(500).json({
      message: "Không thể thêm phòng. Vui lòng kiểm tra lại dữ liệu.",
    });
  }
});

// Cập nhật thông tin phòng
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const roomId = Number(req.params.id);

    const {
      room_code,
      room_number,
      room_type_id,
      area_m2,
      listed_rent,
      description,
    } = req.body;

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({
        message: "Mã phòng không hợp lệ.",
      });
    }

    if (
      !room_code ||
      !room_number ||
      !room_type_id ||
      listed_rent === undefined ||
      listed_rent === null ||
      listed_rent === ""
    ) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ thông tin bắt buộc.",
      });
    }

    const code = String(room_code).trim();
    const number = String(room_number).trim();
    const typeId = Number(room_type_id);
    const rent = Number(listed_rent);

    const area =
      area_m2 === "" || area_m2 === null || area_m2 === undefined
        ? null
        : Number(area_m2);

    if (!code || !number) {
      return res.status(400).json({
        message: "Mã phòng và số phòng không được để trống.",
      });
    }

    if (!Number.isInteger(typeId) || typeId <= 0) {
      return res.status(400).json({
        message: "Loại phòng không hợp lệ.",
      });
    }

    if (!Number.isFinite(rent) || rent < 0) {
      return res.status(400).json({
        message: "Giá thuê phải là số không âm.",
      });
    }

    if (area !== null && (!Number.isFinite(area) || area <= 0)) {
      return res.status(400).json({
        message: "Diện tích phải lớn hơn 0.",
      });
    }

    const [currentRooms] = await db.query(
      "SELECT room_id FROM rooms WHERE room_id = ?",
      [roomId],
    );

    if (currentRooms.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy phòng cần sửa.",
      });
    }

    const [existingRooms] = await db.query(
      `SELECT room_id
       FROM rooms
       WHERE (room_code = ? OR room_number = ?)
       AND room_id <> ?`,
      [code, number, roomId],
    );

    if (existingRooms.length > 0) {
      return res.status(409).json({
        message: "Mã phòng hoặc số phòng đã được sử dụng.",
      });
    }

    await db.query(
      `UPDATE rooms
       SET room_code = ?,
           room_number = ?,
           room_type_id = ?,
           area_m2 = ?,
           listed_rent = ?,
           description = ?
       WHERE room_id = ?`,
      [
        code,
        number,
        typeId,
        area,
        rent,
        description ? String(description).trim() : null,
        roomId,
      ],
    );

    return res.status(200).json({
      message: "Cập nhật thông tin phòng thành công!",
      room_id: roomId,
    });
  } catch (error) {
    console.error("Lỗi cập nhật phòng:", error);

    return res.status(500).json({
      message: "Không thể cập nhật phòng. Vui lòng thử lại.",
    });
  }
});

// Cập nhật riêng trạng thái phòng
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const { status } = req.body;
    const allowedStatuses = [
      "AVAILABLE",
      "OCCUPIED",
      "HOLD",
      "MAINTENANCE",
      "PROCESSING",
    ];

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ message: "Mã phòng không hợp lệ." });
    }

    if (!allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json({ message: "Trạng thái phòng không hợp lệ." });
    }

    const [result] = await db.query(
      "UPDATE rooms SET status = ? WHERE room_id = ?",
      [status, roomId],
    );

    if (result.affectedRows === 0) {
      const [rooms] = await db.query(
        "SELECT room_id FROM rooms WHERE room_id = ?",
        [roomId],
      );
      if (rooms.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy phòng." });
      }
    }

    return res.status(200).json({
      message: "Cập nhật trạng thái phòng thành công.",
      room_id: roomId,
      status,
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái phòng:", error);
    return res.status(500).json({
      message: "Không thể cập nhật trạng thái phòng.",
    });
  }
});

// Xóa phòng
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const roomId = Number(req.params.id);

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ message: "Mã phòng không hợp lệ." });
    }

    const [rooms] = await db.query(
      "SELECT room_id, status FROM rooms WHERE room_id = ?",
      [roomId],
    );

    if (rooms.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy phòng." });
    }

    if (rooms[0].status === "OCCUPIED") {
      return res.status(409).json({
        message: "Không thể xóa phòng đang có người thuê.",
      });
    }

    await db.query("DELETE FROM rooms WHERE room_id = ?", [roomId]);

    return res.status(200).json({
      message: "Xóa phòng thành công.",
      room_id: roomId,
    });
  } catch (error) {
    console.error("Lỗi xóa phòng:", error);
    return res.status(500).json({ message: "Không thể xóa phòng." });
  }
});

module.exports = router;
