const express = require("express");
const db = require("../config/db");
const authMiddleware = require("./xacThuc");

const router = express.Router();
const priorities = new Set(["LOW", "NORMAL", "HIGH"]);
const statuses = new Set(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const serviceSelect = `
  SELECT s.service_id, s.room_id, r.room_code, s.category, s.title, s.description,
         s.priority, s.status, s.reported_date, s.cost, s.resolution_notes,
         s.created_at, s.updated_at
  FROM room_services s
  INNER JOIN rooms r ON r.room_id = s.room_id`;

function parseService(body = {}) {
  const values = {
    room_id: Number(body.room_id),
    category: String(body.category || "Khác").trim(),
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim() || null,
    priority: String(body.priority || "NORMAL").toUpperCase(),
    status: String(body.status || "OPEN").toUpperCase(),
    reported_date: String(body.reported_date || ""),
    cost: body.cost === "" || body.cost == null ? 0 : Number(body.cost),
    resolution_notes: String(body.resolution_notes || "").trim() || null,
  };
  if (!Number.isInteger(values.room_id) || values.room_id <= 0) return { error: "Vui lòng chọn phòng." };
  if (!values.title || values.title.length > 160) return { error: "Tên sự cố là bắt buộc và tối đa 160 ký tự." };
  if (!values.category || values.category.length > 60) return { error: "Vui lòng chọn nhóm sự cố hợp lệ." };
  if (!priorities.has(values.priority) || !statuses.has(values.status)) return { error: "Mức độ ưu tiên hoặc trạng thái không hợp lệ." };
  if (!validDate(values.reported_date)) return { error: "Ngày ghi nhận không hợp lệ." };
  if (!Number.isFinite(values.cost) || values.cost < 0) return { error: "Chi phí sửa chữa phải là số không âm." };
  if (values.description && values.description.length > 5000) return { error: "Mô tả quá dài." };
  if (values.resolution_notes && values.resolution_notes.length > 5000) return { error: "Ghi chú xử lý quá dài." };
  return { values };
}

router.use(authMiddleware);

router.get("/options", async (req, res) => {
  try {
    const [rooms] = await db.query("SELECT room_id, room_code FROM rooms ORDER BY room_code ASC");
    return res.json({ data: rooms });
  } catch (error) {
    console.error("Lỗi tải phòng cho dịch vụ:", error.code || error.message);
    return res.status(500).json({ message: "Không thể tải danh sách phòng." });
  }
});

router.get("/", async (req, res) => {
  const status = String(req.query.status || "").trim().toUpperCase();
  const keyword = `%${String(req.query.keyword || "").trim()}%`;
  if (status && !statuses.has(status)) return res.status(400).json({ message: "Trạng thái xử lý không hợp lệ." });
  try {
    const params = [keyword, keyword, keyword, keyword];
    let where = "WHERE (r.room_code LIKE ? OR s.title LIKE ? OR s.category LIKE ? OR COALESCE(s.description, '') LIKE ?)";
    if (status) { where += " AND s.status = ?"; params.push(status); }
    const [rows] = await db.query(`${serviceSelect} ${where} ORDER BY FIELD(s.status, 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'), s.reported_date DESC, s.service_id DESC`, params);
    return res.json({ data: rows });
  } catch (error) {
    console.error("Lỗi tải danh sách dịch vụ:", error.code || error.message);
    return res.status(500).json({ message: "Không thể tải danh sách sửa chữa." });
  }
});

router.post("/", async (req, res) => {
  const { values, error } = parseService(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const [result] = await db.query(
      `INSERT INTO room_services (room_id, category, title, description, priority, status, reported_date, cost, resolution_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [values.room_id, values.category, values.title, values.description, values.priority, values.status, values.reported_date, values.cost, values.resolution_notes],
    );
    const [rows] = await db.query(`${serviceSelect} WHERE s.service_id = ?`, [result.insertId]);
    return res.status(201).json({ message: "Đã ghi nhận yêu cầu sửa chữa.", data: rows[0] });
  } catch (error) {
    console.error("Lỗi tạo yêu cầu sửa chữa:", error.code || error.message);
    return res.status(500).json({ message: "Không thể lưu yêu cầu sửa chữa." });
  }
});

router.put("/:id", async (req, res) => {
  const serviceId = Number(req.params.id);
  if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: "Mã yêu cầu không hợp lệ." });
  const { values, error } = parseService(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const [result] = await db.query(
      `UPDATE room_services SET room_id = ?, category = ?, title = ?, description = ?, priority = ?, status = ?, reported_date = ?, cost = ?, resolution_notes = ?
       WHERE service_id = ?`,
      [values.room_id, values.category, values.title, values.description, values.priority, values.status, values.reported_date, values.cost, values.resolution_notes, serviceId],
    );
    if (!result.affectedRows) {
      const [exists] = await db.query("SELECT service_id FROM room_services WHERE service_id = ?", [serviceId]);
      if (!exists.length) return res.status(404).json({ message: "Không tìm thấy yêu cầu sửa chữa." });
    }
    const [rows] = await db.query(`${serviceSelect} WHERE s.service_id = ?`, [serviceId]);
    return res.json({ message: "Đã cập nhật yêu cầu sửa chữa.", data: rows[0] });
  } catch (error) {
    console.error("Lỗi cập nhật yêu cầu sửa chữa:", error.code || error.message);
    return res.status(500).json({ message: "Không thể cập nhật yêu cầu sửa chữa." });
  }
});

router.delete("/:id", async (req, res) => {
  const serviceId = Number(req.params.id);
  if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: "Mã yêu cầu không hợp lệ." });
  try {
    const [result] = await db.query("DELETE FROM room_services WHERE service_id = ?", [serviceId]);
    if (!result.affectedRows) return res.status(404).json({ message: "Không tìm thấy yêu cầu sửa chữa." });
    return res.json({ message: "Đã xóa yêu cầu sửa chữa." });
  } catch (error) {
    console.error("Lỗi xóa yêu cầu sửa chữa:", error.code || error.message);
    return res.status(500).json({ message: "Không thể xóa yêu cầu sửa chữa." });
  }
});

module.exports = router;
