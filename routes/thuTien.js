const express = require("express");
const db = require("../config/db");
const authMiddleware = require("./xacThuc");

const router = express.Router();
const methods = new Set(["CASH", "BANK_TRANSFER", "OTHER"]);
const dateIsValid = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const selectPayments = `
  SELECT p.payment_id, p.contract_id, p.billing_month, p.rent_amount,
         p.electricity_amount, p.electricity_previous_reading, p.electricity_current_reading, p.electricity_unit_price,
         p.water_amount, p.water_previous_reading, p.water_current_reading, p.water_unit_price, p.other_amount,
         p.rent_paid_amount, p.electricity_paid_amount, p.water_paid_amount, p.other_paid_amount,
         (p.rent_paid_amount + p.electricity_paid_amount + p.water_paid_amount + p.other_paid_amount) AS paid_amount,
         p.due_date, p.payment_method, p.notes, p.paid_at,
         (p.rent_amount + p.electricity_amount + p.water_amount + p.other_amount) AS total_amount,
         GREATEST(p.rent_amount + p.electricity_amount + p.water_amount + p.other_amount - p.rent_paid_amount - p.electricity_paid_amount - p.water_paid_amount - p.other_paid_amount, 0) AS remaining_amount,
         CASE WHEN p.rent_paid_amount + p.electricity_paid_amount + p.water_paid_amount + p.other_paid_amount >= p.rent_amount + p.electricity_amount + p.water_amount + p.other_amount THEN 'PAID'
              WHEN p.rent_paid_amount + p.electricity_paid_amount + p.water_paid_amount + p.other_paid_amount > 0 THEN 'PARTIAL' ELSE 'UNPAID' END AS status,
         c.contract_code, r.room_code, t.full_name AS tenant_name, t.phone AS tenant_phone
  FROM payment_records p
  INNER JOIN contracts c ON c.contract_id = p.contract_id
  INNER JOIN rooms r ON r.room_id = c.room_id
  INNER JOIN tenants t ON t.tenant_id = c.tenant_id`;

function parseAmounts(body = {}) {
  const amount = (key) => body[key] === "" || body[key] == null ? 0 : Number(body[key]);
  const values = {
    contract_id: Number(body.contract_id),
    billing_month: String(body.billing_month || ""),
    electricity_previous_reading: amount("electricity_previous_reading"),
    electricity_current_reading: amount("electricity_current_reading"),
    electricity_unit_price: amount("electricity_unit_price"),
    water_previous_reading: amount("water_previous_reading"),
    water_current_reading: amount("water_current_reading"),
    water_unit_price: amount("water_unit_price"),
    other_amount: amount("other_amount"),
    rent_paid_amount: amount("rent_paid_amount"),
    electricity_paid_amount: amount("electricity_paid_amount"),
    water_paid_amount: amount("water_paid_amount"),
    other_paid_amount: amount("other_paid_amount"),
    due_date: String(body.due_date || ""),
    payment_method: String(body.payment_method || "").trim().toUpperCase() || null,
    notes: String(body.notes || "").trim() || null,
  };
  if (!Number.isInteger(values.contract_id) || values.contract_id <= 0) return { error: "Vui lòng chọn hợp đồng hợp lệ." };
  if (!/^\d{4}-\d{2}$/.test(values.billing_month)) return { error: "Tháng thu tiền không hợp lệ." };
  const [, billingMonthNumber] = values.billing_month.split("-").map(Number);
  if (billingMonthNumber < 1 || billingMonthNumber > 12) return { error: "Tháng thu tiền không hợp lệ." };
  values.billing_month = `${values.billing_month}-01`;
  if (!dateIsValid(values.due_date)) return { error: "Ngày đến hạn không hợp lệ." };
  for (const key of ["electricity_previous_reading", "electricity_current_reading", "electricity_unit_price", "water_previous_reading", "water_current_reading", "water_unit_price", "other_amount", "rent_paid_amount", "electricity_paid_amount", "water_paid_amount", "other_paid_amount"]) {
    if (!Number.isFinite(values[key]) || values[key] < 0) return { error: "Chỉ số và các khoản tiền phải là số không âm." };
  }
  if (values.electricity_current_reading < values.electricity_previous_reading || values.water_current_reading < values.water_previous_reading) {
    return { error: "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ." };
  }
  values.electricity_amount = Math.round((values.electricity_current_reading - values.electricity_previous_reading) * values.electricity_unit_price);
  values.water_amount = Math.round((values.water_current_reading - values.water_previous_reading) * values.water_unit_price);
  if (values.payment_method && !methods.has(values.payment_method)) return { error: "Hình thức thanh toán không hợp lệ." };
  if (values.notes && values.notes.length > 1000) return { error: "Ghi chú quá dài." };
  return { values };
}

router.use(authMiddleware);

router.get("/options", async (req, res) => {
  try {
    const [contracts] = await db.query(
      `SELECT c.contract_id, c.contract_code, c.monthly_rent, r.room_code, t.full_name AS tenant_name
       FROM contracts c INNER JOIN rooms r ON r.room_id = c.room_id
       INNER JOIN tenants t ON t.tenant_id = c.tenant_id
       WHERE c.status = 'ACTIVE' ORDER BY c.contract_id DESC`,
    );
    return res.json({ data: contracts });
  } catch (error) {
    console.error("Lỗi tải hợp đồng thu tiền:", error.code || error.message);
    return res.status(500).json({ message: "Không thể tải danh sách hợp đồng đang hiệu lực." });
  }
});

router.get("/", async (req, res) => {
  const keyword = `%${String(req.query.keyword || "").trim()}%`;
  const status = String(req.query.status || "").trim().toUpperCase();
  if (status && !["PAID", "PARTIAL", "UNPAID"].includes(status)) return res.status(400).json({ message: "Trạng thái khoản thu không hợp lệ." });
  try {
    const params = [keyword, keyword, keyword, keyword];
    let where = "WHERE (c.contract_code LIKE ? OR r.room_code LIKE ? OR t.full_name LIKE ? OR DATE_FORMAT(p.billing_month, '%Y-%m') LIKE ?)";
    if (status) {
      const paid = "(p.rent_paid_amount + p.electricity_paid_amount + p.water_paid_amount + p.other_paid_amount)";
      const due = "(p.rent_amount + p.electricity_amount + p.water_amount + p.other_amount)";
      where += status === "PAID" ? ` AND ${paid} >= ${due}` : status === "PARTIAL" ? ` AND ${paid} > 0 AND ${paid} < ${due}` : ` AND ${paid} = 0`;
    }
    const [payments] = await db.query(`${selectPayments} ${where} ORDER BY p.billing_month DESC, p.payment_id DESC`, params);
    return res.json({ data: payments });
  } catch (error) {
    console.error("Lỗi tải khoản thu:", error.code || error.message);
    return res.status(500).json({ message: "Không thể tải danh sách khoản thu." });
  }
});

async function savePayment(req, res, updating) {
  const paymentId = updating ? Number(req.params.id) : null;
  if (updating && (!Number.isInteger(paymentId) || paymentId <= 0)) return res.status(400).json({ message: "Mã khoản thu không hợp lệ." });
  const { values, error } = parseAmounts(req.body);
  if (error) return res.status(400).json({ message: error });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [contracts] = await connection.query("SELECT contract_id, monthly_rent, status FROM contracts WHERE contract_id = ? FOR UPDATE", [values.contract_id]);
    if (!contracts.length) { await connection.rollback(); return res.status(400).json({ message: "Không tìm thấy hợp đồng đã chọn." }); }
    if (!updating && contracts[0].status !== "ACTIVE") { await connection.rollback(); return res.status(400).json({ message: "Chỉ có thể tạo khoản thu cho hợp đồng đang hiệu lực." }); }
    const rentAmount = Number(contracts[0].monthly_rent) || 0;
    const dueAmounts = {
      rent_paid_amount: rentAmount,
      electricity_paid_amount: values.electricity_amount,
      water_paid_amount: values.water_amount,
      other_paid_amount: values.other_amount,
    };
    for (const [key, dueAmount] of Object.entries(dueAmounts)) {
      if (values[key] > dueAmount) {
        await connection.rollback();
        const names = { rent_paid_amount: "tiền thuê", electricity_paid_amount: "tiền điện", water_paid_amount: "tiền nước", other_paid_amount: "khoản khác" };
        return res.status(400).json({ message: `Số ${names[key]} đã thu không được lớn hơn số phải thu.` });
      }
    }
    const totalPaid = values.rent_paid_amount + values.electricity_paid_amount + values.water_paid_amount + values.other_paid_amount;
    if (updating) {
      const [existing] = await connection.query("SELECT payment_id, contract_id, billing_month FROM payment_records WHERE payment_id = ? FOR UPDATE", [paymentId]);
      if (!existing.length) { await connection.rollback(); return res.status(404).json({ message: "Không tìm thấy khoản thu." }); }
      if (Number(existing[0].contract_id) !== values.contract_id || String(existing[0].billing_month).slice(0, 7) !== values.billing_month.slice(0, 7)) {
        await connection.rollback();
        return res.status(400).json({ message: "Không thể đổi hợp đồng hoặc tháng của khoản thu đã tạo." });
      }
      await connection.query(
        `UPDATE payment_records SET electricity_amount = ?, electricity_previous_reading = ?, electricity_current_reading = ?, electricity_unit_price = ?,
         water_amount = ?, water_previous_reading = ?, water_current_reading = ?, water_unit_price = ?, other_amount = ?,
         rent_paid_amount = ?, electricity_paid_amount = ?, water_paid_amount = ?, other_paid_amount = ?, paid_amount = ?,
         due_date = ?, payment_method = ?, notes = ?, paid_at = CASE WHEN ? > 0 THEN COALESCE(paid_at, NOW()) ELSE NULL END WHERE payment_id = ?`,
        [values.electricity_amount, values.electricity_previous_reading, values.electricity_current_reading, values.electricity_unit_price,
          values.water_amount, values.water_previous_reading, values.water_current_reading, values.water_unit_price, values.other_amount,
          values.rent_paid_amount, values.electricity_paid_amount, values.water_paid_amount, values.other_paid_amount, totalPaid, values.due_date, values.payment_method, values.notes, totalPaid, paymentId],
      );
    } else {
      await connection.query(
        `INSERT INTO payment_records (contract_id, billing_month, rent_amount,
         electricity_amount, electricity_previous_reading, electricity_current_reading, electricity_unit_price,
         water_amount, water_previous_reading, water_current_reading, water_unit_price, other_amount,
         rent_paid_amount, electricity_paid_amount, water_paid_amount, other_paid_amount, paid_amount,
         due_date, payment_method, notes, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? > 0 THEN NOW() ELSE NULL END)`,
        [values.contract_id, values.billing_month, rentAmount,
          values.electricity_amount, values.electricity_previous_reading, values.electricity_current_reading, values.electricity_unit_price,
          values.water_amount, values.water_previous_reading, values.water_current_reading, values.water_unit_price, values.other_amount,
          values.rent_paid_amount, values.electricity_paid_amount, values.water_paid_amount, values.other_paid_amount, totalPaid,
          values.due_date, values.payment_method, values.notes, totalPaid],
      );
    }
    const queryId = paymentId || (await connection.query("SELECT LAST_INSERT_ID() AS payment_id"))[0][0].payment_id;
    const [rows] = await connection.query(`${selectPayments} WHERE p.payment_id = ?`, [queryId]);
    await connection.commit();
    return res.status(updating ? 200 : 201).json({ message: updating ? "Cập nhật khoản thu thành công." : "Tạo khoản thu thành công.", data: rows[0] });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Hợp đồng này đã có khoản thu cho tháng đã chọn." });
    console.error("Lỗi lưu khoản thu:", error.code || error.message);
    return res.status(500).json({ message: "Không thể lưu khoản thu." });
  } finally {
    connection.release();
  }
}

router.post("/", (req, res) => savePayment(req, res, false));
router.put("/:id", (req, res) => savePayment(req, res, true));

router.patch("/:id/status", async (req, res) => {
  const paymentId = Number(req.params.id);
  const status = String(req.body.status || "").trim().toUpperCase();
  if (!Number.isInteger(paymentId) || paymentId <= 0) return res.status(400).json({ message: "Mã khoản thu không hợp lệ." });
  if (!new Set(["PAID", "UNPAID", "PARTIAL"]).has(status)) return res.status(400).json({ message: "Trạng thái khoản thu không hợp lệ." });
  if (status === "PARTIAL") {
    const paidAmount = Number(req.body.paid_amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) return res.status(400).json({ message: "Vui lòng nhập số tiền đã nhận lớn hơn 0." });
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT rent_amount, electricity_amount, water_amount, other_amount
         FROM payment_records WHERE payment_id = ? FOR UPDATE`, [paymentId],
      );
      if (!rows.length) { await connection.rollback(); return res.status(404).json({ message: "Không tìm thấy khoản thu." }); }
      const payment = rows[0];
      const totalDue = Number(payment.rent_amount) + Number(payment.electricity_amount) + Number(payment.water_amount) + Number(payment.other_amount);
      if (paidAmount >= totalDue) {
        await connection.rollback();
        return res.status(400).json({ message: "Số tiền đã thu phải nhỏ hơn tổng phải thu. Nếu đã thu đủ, hãy chọn Đã thu đủ." });
      }
      let unallocated = paidAmount;
      const allocations = {};
      for (const [paidKey, dueKey] of [["rent_paid_amount", "rent_amount"], ["electricity_paid_amount", "electricity_amount"], ["water_paid_amount", "water_amount"], ["other_paid_amount", "other_amount"]]) {
        allocations[paidKey] = Math.min(unallocated, Number(payment[dueKey]) || 0);
        unallocated -= allocations[paidKey];
      }
      await connection.query(
        `UPDATE payment_records SET rent_paid_amount = ?, electricity_paid_amount = ?, water_paid_amount = ?,
         other_paid_amount = ?, paid_amount = ?, paid_at = NOW() WHERE payment_id = ?`,
        [allocations.rent_paid_amount, allocations.electricity_paid_amount, allocations.water_paid_amount, allocations.other_paid_amount, paidAmount, paymentId],
      );
      await connection.commit();
      return res.json({ message: "Đã cập nhật số tiền thu một phần." });
    } catch (error) {
      await connection.rollback();
      console.error("Lỗi cập nhật số tiền thu một phần:", error.code || error.message);
      return res.status(500).json({ message: "Không thể cập nhật khoản thu." });
    } finally { connection.release(); }
  }
  try {
    const [result] = status === "PAID"
      ? await db.query(
        `UPDATE payment_records SET rent_paid_amount = rent_amount, electricity_paid_amount = electricity_amount,
         water_paid_amount = water_amount, other_paid_amount = other_amount,
         paid_amount = rent_amount + electricity_amount + water_amount + other_amount, paid_at = NOW()
         WHERE payment_id = ?`, [paymentId],
      )
      : await db.query(
        `UPDATE payment_records SET rent_paid_amount = 0, electricity_paid_amount = 0,
         water_paid_amount = 0, other_paid_amount = 0, paid_amount = 0, paid_at = NULL, payment_method = NULL
         WHERE payment_id = ?`, [paymentId],
      );
    if (!result.affectedRows) {
      const [exists] = await db.query("SELECT payment_id FROM payment_records WHERE payment_id = ?", [paymentId]);
      if (!exists.length) return res.status(404).json({ message: "Không tìm thấy khoản thu." });
    }
    return res.json({ message: status === "PAID" ? "Đã cập nhật trạng thái thành Đã thu đủ." : "Đã cập nhật trạng thái thành Chưa thu." });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái khoản thu:", error.code || error.message);
    return res.status(500).json({ message: "Không thể cập nhật trạng thái khoản thu." });
  }
});

router.delete("/:id", async (req, res) => {
  const paymentId = Number(req.params.id);
  if (!Number.isInteger(paymentId) || paymentId <= 0) return res.status(400).json({ message: "Mã khoản thu không hợp lệ." });
  try {
    const [result] = await db.query("DELETE FROM payment_records WHERE payment_id = ?", [paymentId]);
    if (!result.affectedRows) return res.status(404).json({ message: "Không tìm thấy khoản thu." });
    return res.json({ message: "Xóa khoản thu thành công." });
  } catch (error) {
    console.error("Lỗi xóa khoản thu:", error.code || error.message);
    return res.status(500).json({ message: "Không thể xóa khoản thu." });
  }
});

module.exports = router;
