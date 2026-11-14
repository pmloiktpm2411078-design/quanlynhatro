const db = require("../config/db");

let dangXuLy = false;

// Kiểm tra và xử lý các phiếu giữ phòng đã hết hạn
async function xuLyGiuPhongHetHan() {
  // Không cho phép hai lần kiểm tra chạy đồng thời
  if (dangXuLy) return;

  dangXuLy = true;

  try {
    // Lấy danh sách phiếu đã hết hạn
    const [expiredDeposits] = await db.query(
      `SELECT reservation_id, room_id
       FROM reservation_deposits
       WHERE status = 'HOLD'
         AND expire_time <= NOW()
       ORDER BY expire_time ASC`,
    );

    if (expiredDeposits.length === 0) {
      return;
    }

    console.log(
      `Tìm thấy ${expiredDeposits.length} phiếu giữ phòng cần xử lý.`,
    );

    // Xử lý từng phiếu bằng transaction riêng
    for (const item of expiredDeposits) {
      let connection;
      let transactionStarted = false;

      try {
        connection = await db.getConnection();

        await connection.beginTransaction();
        transactionStarted = true;

        // 1. Khóa phòng trước để thống nhất thứ tự khóa
        const [rooms] = await connection.query(
          `SELECT room_id, status
           FROM rooms
           WHERE room_id = ?
           FOR UPDATE`,
          [item.room_id],
        );

        if (rooms.length === 0) {
          throw new Error(`Không tìm thấy phòng ${item.room_id}.`);
        }

        // 2. Khóa và kiểm tra lại phiếu giữ phòng
        // Dùng NOW() của MySQL để tránh lệch múi giờ
        const [deposits] = await connection.query(
          `SELECT reservation_id, room_id
           FROM reservation_deposits
           WHERE reservation_id = ?
             AND status = 'HOLD'
             AND expire_time <= NOW()
           FOR UPDATE`,
          [item.reservation_id],
        );

        // Phiếu đã được xử lý hoặc chưa hết hạn
        if (deposits.length === 0) {
          await connection.rollback();
          transactionStarted = false;
          continue;
        }

        // 3. Chuyển phiếu giữ phòng thành EXPIRED
        await connection.query(
          `UPDATE reservation_deposits
           SET status = 'EXPIRED'
           WHERE reservation_id = ?
             AND status = 'HOLD'`,
          [item.reservation_id],
        );

        // 4. Kiểm tra phòng có hợp đồng đang hoạt động không
        const [contracts] = await connection.query(
          `SELECT contract_id
           FROM contracts
           WHERE room_id = ?
             AND status = 'ACTIVE'
           LIMIT 1`,
          [item.room_id],
        );

        // 5. Kiểm tra có phiếu giữ phòng khác còn hiệu lực không
        const [otherHolds] = await connection.query(
          `SELECT reservation_id
           FROM reservation_deposits
           WHERE room_id = ?
             AND reservation_id <> ?
             AND status = 'HOLD'
             AND expire_time > NOW()
           LIMIT 1`,
          [item.room_id, item.reservation_id],
        );

        // 6. Chỉ trả phòng về AVAILABLE khi đủ điều kiện
        if (
          rooms[0].status === "HOLD" &&
          contracts.length === 0 &&
          otherHolds.length === 0
        ) {
          await connection.query(
            `UPDATE rooms
             SET status = 'AVAILABLE'
             WHERE room_id = ?
               AND status = 'HOLD'`,
            [item.room_id],
          );
        }

        // 7. Hoàn tất transaction
        await connection.commit();
        transactionStarted = false;

        console.log(`Đã xử lý phiếu giữ phòng #${item.reservation_id}.`);
      } catch (error) {
        if (connection && transactionStarted) {
          await connection.rollback();
        }

        console.error(
          `Lỗi xử lý phiếu #${item.reservation_id}:`,
          error.message,
        );
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }
  } catch (error) {
    console.error("Lỗi kiểm tra phiếu giữ phòng hết hạn:", error);
  } finally {
    dangXuLy = false;
  }
}

// Khởi động bộ xử lý
function batDauXuLyGiuPhongHetHan() {
  console.log("Đang khởi động bộ xử lý hết hạn giữ phòng...");

  // Kiểm tra ngay khi server khởi động
  xuLyGiuPhongHetHan();

  // Kiểm tra định kỳ mỗi phút
  setInterval(() => {
    xuLyGiuPhongHetHan();
  }, 60 * 1000);
}

module.exports = batDauXuLyGiuPhongHetHan;
