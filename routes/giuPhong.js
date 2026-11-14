const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("./xacThuc");

// Tất cả API trong file này đều yêu cầu đăng nhập
router.use(authMiddleware);

// API: Tạo phiếu đặt cọc giữ phòng trong 120 giờ
router.post("/dat-coc", async (req, res) => {
  // Chỉ nhân viên (roleId = 3) được tạo phiếu giữ phòng
  if (Number(req.user?.roleId) !== 3) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền tạo phiếu giữ phòng.",
    });
  }

  const roomId = Number(req.body.room_id);
  const tenantId = Number(req.body.tenant_id);
  const depositAmount = Number(req.body.deposit_amount);

  // Kiểm tra dữ liệu đầu vào
  if (
    !Number.isInteger(roomId) ||
    roomId <= 0 ||
    !Number.isInteger(tenantId) ||
    tenantId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Mã phòng hoặc mã người thuê không hợp lệ.",
    });
  }

  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Số tiền đặt cọc phải lớn hơn 0.",
    });
  }

  let connection;

  try {
    connection = await db.getConnection();

    // Bắt đầu transaction
    await connection.beginTransaction();

    // 1. Khóa phòng để tránh hai người giữ cùng một phòng
    const [rooms] = await connection.query(
      `SELECT room_id, status
       FROM rooms
       WHERE room_id = ?
       FOR UPDATE`,
      [roomId],
    );

    if (rooms.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng.",
      });
    }

    // 2. Chỉ cho phép giữ phòng đang AVAILABLE
    if (rooms[0].status !== "AVAILABLE") {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Phòng hiện không còn trống để giữ.",
      });
    }

    // 3. Kiểm tra người thuê có tồn tại
    const [tenants] = await connection.query(
      `SELECT tenant_id
       FROM tenants
       WHERE tenant_id = ?`,
      [tenantId],
    );

    if (tenants.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người thuê.",
      });
    }

    // 4. Kiểm tra phòng có hợp đồng đang hoạt động hay không
    const [contracts] = await connection.query(
      `SELECT contract_id
       FROM contracts
       WHERE room_id = ?
         AND status = 'ACTIVE'
       LIMIT 1`,
      [roomId],
    );

    if (contracts.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Phòng đã có hợp đồng đang hoạt động.",
      });
    }

    // 5. Lấy thời điểm từ database
    // Thời hạn giữ phòng chính xác 120 giờ
    const [times] = await connection.query(
      `SELECT
         NOW() AS start_time,
         DATE_ADD(NOW(), INTERVAL 120 HOUR) AS expire_time`,
    );

    const startTime = times[0].start_time;
    const expireTime = times[0].expire_time;

    // 6. Tạo phiếu đặt cọc
    // created_by lấy từ JWT, không lấy từ frontend
    const [depositResult] = await connection.query(
      `INSERT INTO reservation_deposits
        (
          room_id,
          tenant_id,
          deposit_amount,
          start_time,
          expire_time,
          status,
          created_by
        )
       VALUES (?, ?, ?, ?, ?, 'HOLD', ?)`,
      [roomId, tenantId, depositAmount, startTime, expireTime, req.user.userId],
    );

    // 7. Chuyển trạng thái phòng sang HOLD
    const [roomUpdate] = await connection.query(
      `UPDATE rooms
       SET status = 'HOLD'
       WHERE room_id = ?
         AND status = 'AVAILABLE'`,
      [roomId],
    );

    if (roomUpdate.affectedRows !== 1) {
      throw new Error("Không thể cập nhật trạng thái phòng.");
    }

    // 8. Hoàn tất transaction
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Giữ phòng thành công trong 120 giờ.",
      reservation_id: depositResult.insertId,
      room_id: roomId,
      tenant_id: tenantId,
      deposit_amount: depositAmount,
      start_time: startTime,
      expire_time: expireTime,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Lỗi tạo phiếu giữ phòng:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo phiếu giữ phòng.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
