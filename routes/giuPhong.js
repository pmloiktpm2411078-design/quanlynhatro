const express = require("express");
const router = express.Router();
const db = require("../config/db");

// API: Tạo phiếu đặt cọc giữ phòng (thời hạn 120 giờ = 5 ngày)
router.post("/dat-coc", async (req, res) => {
  const { room_id, tenant_id, deposit_amount, created_by } = req.body;

  try {
    const startTime = new Date();
    const expireTime = new Date(startTime.getTime() + 120 * 60 * 60 * 1000);

    // 1. Thêm bản ghi vào bảng reservation_deposits
    const sqlDeposit = `
      INSERT INTO reservation_deposits 
      (room_id, tenant_id, deposit_amount, start_time, expire_time, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'HOLD', ?)
    `;
    await db.query(sqlDeposit, [
      room_id,
      tenant_id,
      deposit_amount,
      startTime,
      expireTime,
      created_by,
    ]);

    // 2. Đổi trạng thái phòng sang 'HOLD'
    const sqlUpdateRoom = `UPDATE rooms SET status = 'HOLD' WHERE room_id = ?`;
    await db.query(sqlUpdateRoom, [room_id]);

    res.status(200).json({
      success: true,
      message: "Đặt giữ phòng 120h thành công!",
      expire_time: expireTime,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi đặt giữ phòng" });
  }
});

module.exports = router;
