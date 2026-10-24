const express = require("express");
const db = require("../config/db");
const authMiddleware = require("./xacThuc");

const router = express.Router();
const allowedStatuses = new Set(["ACTIVE", "ENDED", "CANCELLED"]);

function parseContract(body = {}) {
  const contract = {
    contract_code: String(body.contract_code || "").trim(),
    room_id: Number(body.room_id),
    tenant_id: Number(body.tenant_id),
    start_date: String(body.start_date || "").trim(),
    end_date: String(body.end_date || "").trim() || null,
    monthly_rent: Number(body.monthly_rent),
    deposit_amount: body.deposit_amount === "" || body.deposit_amount == null ? 0 : Number(body.deposit_amount),
    status: String(body.status || "ACTIVE").trim().toUpperCase(),
    notes: String(body.notes || "").trim() || null,
  };

  if (!contract.contract_code || contract.contract_code.length > 40) {
    return { error: "Nhập mã hợp đồng (tối đa 40 ký tự)." };
  }
  if (!Number.isInteger(contract.room_id) || contract.room_id <= 0 || !Number.isInteger(contract.tenant_id) || contract.tenant_id <= 0) {
    return { error: "Vui lòng chọn phòng và khách thuê hợp lệ." };
  }
  const isDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  };
  if (!isDate(contract.start_date) || (contract.end_date && !isDate(contract.end_date))) {
    return { error: "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ." };
  }
  if (contract.end_date && contract.end_date < contract.start_date) {
    return { error: "Ngày kết thúc phải sau ngày bắt đầu." };
  }
  if (!Number.isFinite(contract.monthly_rent) || contract.monthly_rent < 0 || !Number.isFinite(contract.deposit_amount) || contract.deposit_amount < 0) {
    return { error: "Tiền thuê và tiền cọc phải là số không âm." };
  }
  if (!allowedStatuses.has(contract.status)) return { error: "Trạng thái hợp đồng không hợp lệ." };
  if (contract.status === "ACTIVE" && contract.end_date && contract.end_date < new Date().toISOString().slice(0, 10)) {
    return { error: "Hợp đồng đã hết ngày kết thúc, hãy chọn trạng thái Đã kết thúc." };
  }
  if (contract.notes && contract.notes.length > 5000) return { error: "Ghi chú quá dài." };
  return { contract };
}

const selectContracts = `
  SELECT c.contract_id, c.contract_code, c.room_id, c.tenant_id,
         c.start_date, c.end_date, c.monthly_rent, c.deposit_amount,
         c.status, c.notes, c.created_at,
         r.room_code, r.room_number, t.full_name AS tenant_name, t.phone AS tenant_phone
  FROM contracts c
  INNER JOIN rooms r ON r.room_id = c.room_id
  INNER JOIN tenants t ON t.tenant_id = c.tenant_id`;

router.use(authMiddleware);

router.get("/options", async (req, res) => {
  try {
    const [[rooms], [tenants]] = await Promise.all([
      db.query("SELECT room_id, room_code, room_number, listed_rent, status FROM rooms ORDER BY room_code"),
      db.query("SELECT tenant_id, full_name, phone FROM tenants ORDER BY full_name"),
    ]);
    return res.json({ data: { rooms, tenants } });
  } catch (error) {
    console.error("Lỗi tải dữ liệu hợp đồng:", error.code || error.message);
    return res.status(500).json({ message: "Không thể tải phòng và khách thuê." });
  }
});

router.get("/", async (req, res) => {
  const keyword = `%${String(req.query.keyword || "").trim()}%`;
  const status = String(req.query.status || "").trim().toUpperCase();
  if (status && !allowedStatuses.has(status)) return res.status(400).json({ message: "Trạng thái lọc không hợp lệ." });
  try {
    const params = [keyword, keyword, keyword];
    let where = "WHERE (c.contract_code LIKE ? OR r.room_code LIKE ? OR t.full_name LIKE ?)";
    if (status) { where += " AND c.status = ?"; params.push(status); }
    const [contracts] = await db.query(`${selectContracts} ${where} ORDER BY c.contract_id DESC`, params);
    return res.json({ data: contracts });
  } catch (error) {
    console.error("Lỗi tải hợp đồng:", error.code || error.message);
    return res.status(500).json({ message: "Không thể tải danh sách hợp đồng." });
  }
});

async function saveContract(req, res, updating) {
  const contractId = updating ? Number(req.params.id) : null;
  if (updating && (!Number.isInteger(contractId) || contractId <= 0)) return res.status(400).json({ message: "Mã hợp đồng không hợp lệ." });
  const { contract, error } = parseContract(req.body);
  if (error) return res.status(400).json({ message: error });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let previousContract = null;
    if (updating) {
      const [existingContracts] = await connection.query("SELECT room_id, status FROM contracts WHERE contract_id = ? FOR UPDATE", [contractId]);
      if (!existingContracts.length) { await connection.rollback(); return res.status(404).json({ message: "Không tìm thấy hợp đồng." }); }
      previousContract = existingContracts[0];
    }
    const [rooms] = await connection.query("SELECT room_id FROM rooms WHERE room_id = ? FOR UPDATE", [contract.room_id]);
    const [tenants] = await connection.query("SELECT tenant_id FROM tenants WHERE tenant_id = ?", [contract.tenant_id]);
    if (!rooms.length || !tenants.length) {
      await connection.rollback();
      return res.status(400).json({ message: "Phòng hoặc khách thuê đã bị xóa. Vui lòng tải lại trang." });
    }
    if (contract.status === "ACTIVE") {
      const params = [contract.room_id];
      let conflictSql = "SELECT contract_id FROM contracts WHERE room_id = ? AND status = 'ACTIVE'";
      if (updating) { conflictSql += " AND contract_id <> ?"; params.push(contractId); }
      conflictSql += " LIMIT 1 FOR UPDATE";
      const [conflicts] = await connection.query(conflictSql, params);
      if (conflicts.length) {
        await connection.rollback();
        return res.status(409).json({ message: "Phòng này đã có hợp đồng đang hiệu lực. Hãy kết thúc hợp đồng cũ trước." });
      }
    }

    let id = contractId;
    const values = [contract.contract_code, contract.room_id, contract.tenant_id, contract.start_date, contract.end_date, contract.monthly_rent, contract.deposit_amount, contract.status, contract.notes];
    if (updating) {
      const [result] = await connection.query(
        `UPDATE contracts SET contract_code = ?, room_id = ?, tenant_id = ?, start_date = ?, end_date = ?, monthly_rent = ?, deposit_amount = ?, status = ?, notes = ? WHERE contract_id = ?`,
        [...values, contractId],
      );
      if (!result.affectedRows) {
        const [existing] = await connection.query("SELECT contract_id FROM contracts WHERE contract_id = ?", [contractId]);
        if (!existing.length) { await connection.rollback(); return res.status(404).json({ message: "Không tìm thấy hợp đồng." }); }
      }
    } else {
      const [result] = await connection.query(
        `INSERT INTO contracts (contract_code, room_id, tenant_id, start_date, end_date, monthly_rent, deposit_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values,
      );
      id = result.insertId;
    }

    if (updating && previousContract.status === "ACTIVE" && (previousContract.room_id !== contract.room_id || contract.status !== "ACTIVE")) {
      await connection.query(
        `UPDATE rooms SET status = 'AVAILABLE' WHERE room_id = ? AND status = 'OCCUPIED'
         AND NOT EXISTS (SELECT 1 FROM contracts WHERE room_id = ? AND status = 'ACTIVE' AND contract_id <> ?)`,
        [previousContract.room_id, previousContract.room_id, id],
      );
    }
    if (contract.status === "ACTIVE") {
      await connection.query("UPDATE rooms SET status = 'OCCUPIED' WHERE room_id = ? AND status <> 'MAINTENANCE'", [contract.room_id]);
    } else {
      await connection.query(
        `UPDATE rooms SET status = 'AVAILABLE' WHERE room_id = ? AND status = 'OCCUPIED'
         AND NOT EXISTS (SELECT 1 FROM contracts WHERE room_id = ? AND status = 'ACTIVE' AND contract_id <> ?)`,
        [contract.room_id, contract.room_id, id],
      );
    }
    const [rows] = await connection.query(`${selectContracts} WHERE c.contract_id = ?`, [id]);
    await connection.commit();
    return res.status(updating ? 200 : 201).json({ message: updating ? "Cập nhật hợp đồng thành công." : "Tạo hợp đồng thành công.", data: rows[0] });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Mã hợp đồng đã được sử dụng." });
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ message: "Phòng hoặc khách thuê không tồn tại." });
    console.error("Lỗi lưu hợp đồng:", error.code || error.message);
    return res.status(500).json({ message: "Không thể lưu hợp đồng." });
  } finally {
    connection.release();
  }
}

router.post("/", (req, res) => saveContract(req, res, false));
router.put("/:id", (req, res) => saveContract(req, res, true));

router.delete("/:id", async (req, res) => {
  const contractId = Number(req.params.id);
  if (!Number.isInteger(contractId) || contractId <= 0) return res.status(400).json({ message: "Mã hợp đồng không hợp lệ." });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [contracts] = await connection.query("SELECT room_id, status FROM contracts WHERE contract_id = ? FOR UPDATE", [contractId]);
    if (!contracts.length) { await connection.rollback(); return res.status(404).json({ message: "Không tìm thấy hợp đồng." }); }
    const { room_id: roomId, status } = contracts[0];
    await connection.query("DELETE FROM contracts WHERE contract_id = ?", [contractId]);
    if (status === "ACTIVE") {
      await connection.query(
        `UPDATE rooms SET status = 'AVAILABLE' WHERE room_id = ? AND status = 'OCCUPIED'
         AND NOT EXISTS (SELECT 1 FROM contracts WHERE room_id = ? AND status = 'ACTIVE')`,
        [roomId, roomId],
      );
    }
    await connection.commit();
    return res.json({ message: "Xóa hợp đồng thành công." });
  } catch (error) {
    await connection.rollback();
    console.error("Lỗi xóa hợp đồng:", error.code || error.message);
    return res.status(500).json({ message: "Không thể xóa hợp đồng." });
  } finally {
    connection.release();
  }
});

module.exports = router;
