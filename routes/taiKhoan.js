const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const authMiddleware = require("./xacThuc");

const router = express.Router();
const OWNER_ROLE_ID = 1;
const STAFF_ROLE_ID = 3;

function ownerOnly(req, res, next) {
  if (Number(req.user?.roleId) !== OWNER_ROLE_ID) {
    return res.status(403).json({ message: "Chỉ chủ trọ mới được quản lý tài khoản nhân viên." });
  }
  next();
}

router.get("/staff", authMiddleware, ownerOnly, async (_req, res) => {
  try {
    const [staff] = await db.query(
      `SELECT user_id, username, full_name, email, status
       FROM users
       WHERE role_id = ?
       ORDER BY full_name, username`,
      [STAFF_ROLE_ID],
    );
    return res.json({ data: staff });
  } catch (error) {
    console.error("Lỗi tải tài khoản nhân viên:", error.code || error.message);
    return res.status(500).json({ message: "Không thể tải danh sách nhân viên." });
  }
});

router.post("/staff", authMiddleware, ownerOnly, async (req, res) => {
  const fullName = String(req.body.full_name || "").trim();
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const email = String(req.body.email || "").trim();

  if (!fullName || !username || !password) {
    return res.status(400).json({ message: "Vui lòng nhập họ tên, tên đăng nhập và mật khẩu." });
  }
  if (fullName.length > 100) {
    return res.status(400).json({ message: "Họ tên không được dài quá 100 ký tự." });
  }
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
    return res.status(400).json({ message: "Tên đăng nhập cần từ 3–50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới." });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ message: "Mật khẩu cần từ 8 đến 72 ký tự." });
  }
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) {
    return res.status(400).json({ message: "Email không hợp lệ." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (username, password_hash, full_name, role_id, status, email)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      [username, passwordHash, fullName, STAFF_ROLE_ID, email || null],
    );
    return res.status(201).json({
      message: "Tạo tài khoản nhân viên thành công.",
      data: { user_id: result.insertId, username, full_name: fullName, email: email || null, status: "ACTIVE", role_id: STAFF_ROLE_ID },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Tên đăng nhập này đã được sử dụng." });
    }
    console.error("Lỗi tạo tài khoản nhân viên:", error.code || error.message);
    return res.status(500).json({ message: "Không thể tạo tài khoản nhân viên." });
  }
});


router.put("/staff/:id", authMiddleware, ownerOnly, async (req, res) => {
  const userId = Number(req.params.id);
  const fullName = String(req.body.full_name || "").trim();
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "Tài khoản không hợp lệ." });
  }
  if (!fullName || fullName.length > 100) {
    return res.status(400).json({ message: "Vui lòng nhập họ tên hợp lệ (tối đa 100 ký tự)." });
  }
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) {
    return res.status(400).json({ message: "Email không hợp lệ." });
  }
  if (password && (password.length < 8 || password.length > 72)) {
    return res.status(400).json({ message: "Mật khẩu mới cần từ 8 đến 72 ký tự." });
  }

  try {
    const [accounts] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ? AND role_id = ? LIMIT 1",
      [userId, STAFF_ROLE_ID],
    );
    if (!accounts.length) return res.status(404).json({ message: "Không tìm thấy tài khoản nhân viên." });

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query("UPDATE users SET full_name = ?, email = ?, password_hash = ? WHERE user_id = ? AND role_id = ?", [fullName, email || null, passwordHash, userId, STAFF_ROLE_ID]);
    } else {
      await db.query("UPDATE users SET full_name = ?, email = ? WHERE user_id = ? AND role_id = ?", [fullName, email || null, userId, STAFF_ROLE_ID]);
    }

    const [updated] = await db.query(
      "SELECT user_id, username, full_name, email, status FROM users WHERE user_id = ? AND role_id = ? LIMIT 1",
      [userId, STAFF_ROLE_ID],
    );
    return res.json({ message: "Cập nhật tài khoản thành công.", data: updated[0] });
  } catch (error) {
    console.error("Lỗi cập nhật tài khoản nhân viên:", error.code || error.message);
    return res.status(500).json({ message: "Không thể cập nhật tài khoản nhân viên." });
  }
});

router.patch("/staff/:id/status", authMiddleware, ownerOnly, async (req, res) => {
  const userId = Number(req.params.id);
  const status = String(req.body.status || "").toUpperCase();
  if (!Number.isInteger(userId) || userId <= 0 || !["ACTIVE", "LOCKED"].includes(status)) {
    return res.status(400).json({ message: "Tài khoản hoặc trạng thái không hợp lệ." });
  }

  try {
    const [result] = await db.query(
      "UPDATE users SET status = ? WHERE user_id = ? AND role_id = ?",
      [status, userId, STAFF_ROLE_ID],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Không tìm thấy tài khoản nhân viên." });
    return res.json({ message: status === "ACTIVE" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản." });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái tài khoản:", error.code || error.message);
    return res.status(500).json({ message: "Không thể cập nhật trạng thái tài khoản." });
  }
});

module.exports = router;
