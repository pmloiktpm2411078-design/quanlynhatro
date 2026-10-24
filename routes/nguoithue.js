const express = require("express");
const db = require("../config/db");
const authMiddleware = require("./xacThuc");

const router = express.Router();
const TENANT_ROLE_ID = 2;

const tenantFields = [
  "full_name",
  "date_of_birth",
  "identity_number",
  "phone",
  "email",
  "gender",
  "address",
  "contact_info",
  "user_id",
];

// Query mẫu chuẩn: Lấy thông tin người thuê + Tài khoản + Phòng đang ở qua Hợp đồng ACTIVE
const tenantSelect = `
  SELECT 
    t.tenant_id, 
    t.full_name, 
    DATE_FORMAT(t.date_of_birth, '%Y-%m-%d') AS date_of_birth, 
    t.identity_number,
    t.phone, 
    t.email, 
    t.gender, 
    t.address, 
    t.contact_info, 
    t.user_id,
    u.username AS account_username,
    r.room_id,
    r.room_code,
    r.room_number
  FROM tenants AS t
  LEFT JOIN users AS u ON u.user_id = t.user_id
  LEFT JOIN contracts AS c ON c.tenant_id = t.tenant_id AND c.status = 'ACTIVE'
  LEFT JOIN rooms AS r ON r.room_id = c.room_id
`;

function validateTenant(body = {}) {
  const tenant = {
    full_name: String(body.full_name || "").trim(),
    date_of_birth: String(body.date_of_birth || "").trim(),
    identity_number: String(body.identity_number || "").trim(),
    phone: String(body.phone || "").trim(),
    email: String(body.email || "").trim(),
    gender: String(body.gender || "").trim(),
    address: String(body.address || "").trim(),
    contact_info: String(body.contact_info || "").trim() || null,
    user_id:
      body.user_id === "" || body.user_id === null || body.user_id === undefined
        ? null
        : Number(body.user_id),
  };

  if (
    !tenant.full_name ||
    !tenant.date_of_birth ||
    !tenant.identity_number ||
    !tenant.phone ||
    !tenant.address
  ) {
    return {
      error:
        "Vui lòng nhập đầy đủ họ tên, ngày sinh, CCCD/CMND, số điện thoại và địa chỉ.",
    };
  }

  if (
    tenant.full_name.length > 150 ||
    tenant.address.length > 255 ||
    String(tenant.contact_info || "").length > 255
  ) {
    return { error: "Một trong các thông tin nhập vào quá dài." };
  }

  if (
    tenant.email &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenant.email) ||
      tenant.email.length > 254)
  ) {
    return { error: "Địa chỉ email không hợp lệ." };
  }

  if (tenant.gender && !["Nam", "Nữ", "Khác"].includes(tenant.gender)) {
    return { error: "Giới tính không hợp lệ." };
  }

  if (!/^0\d{9}$/.test(tenant.phone)) {
    return { error: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0." };
  }

  if (!/^\d{9,12}$/.test(tenant.identity_number)) {
    return { error: "CCCD/CMND phải gồm từ 9 đến 12 chữ số." };
  }

  if (
    tenant.user_id !== null &&
    (!Number.isInteger(tenant.user_id) || tenant.user_id <= 0)
  ) {
    return { error: "Tài khoản liên kết không hợp lệ." };
  }

  const dateMatch = tenant.date_of_birth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return { error: "Ngày sinh không hợp lệ." };

  const [, yearText, monthText, dayText] = dateMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date > today
  ) {
    return { error: "Ngày sinh không hợp lệ hoặc lớn hơn ngày hiện tại." };
  }

  return { tenant };
}

async function isTenantAccount(userId) {
  if (userId === null) return true;
  const [users] = await db.query(
    "SELECT user_id FROM users WHERE user_id = ? AND status = 'ACTIVE' AND role_id = ? LIMIT 1",
    [userId, TENANT_ROLE_ID],
  );
  return users.length > 0;
}

function handleDatabaseError(error, res, action) {
  console.error(`Lỗi ${action} khách thuê:`, error.code || error.message);
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message:
        "CCCD/CMND này đã được sử dụng hoặc tài khoản đã liên kết với hồ sơ khác.",
    });
  }
  return res.status(500).json({
    message: `Không thể ${action} khách thuê.`,
    detail: error.message,
  });
}

// 1. GET /api/tenants/accounts - Lấy danh sách tài khoản hợp lệ
router.get("/accounts", authMiddleware, async (req, res) => {
  try {
    const [accounts] = await db.query(
      `SELECT user_id, username, full_name, email
       FROM users
       WHERE status = 'ACTIVE' AND role_id = ?
       ORDER BY full_name, username`,
      [TENANT_ROLE_ID],
    );
    return res.status(200).json({ data: accounts });
  } catch (error) {
    return handleDatabaseError(error, res, "tải tài khoản");
  }
});

// 2. GET /api/tenants - Lấy danh sách người thuê (Có lọc theo keyword)
router.get("/", authMiddleware, async (req, res) => {
  const rawKeyword = String(req.query.keyword || "").trim();
  const keyword = `%${rawKeyword}%`;

  try {
    const [tenants] = await db.query(
      `${tenantSelect}
       WHERE t.full_name LIKE ? 
          OR t.phone LIKE ? 
          OR t.identity_number LIKE ? 
          OR t.email LIKE ? 
          OR r.room_code LIKE ? 
          OR r.room_number LIKE ?
       ORDER BY t.tenant_id DESC`,
      [keyword, keyword, keyword, keyword, keyword, keyword],
    );

    return res
      .status(200)
      .json({ message: "Lấy danh sách khách thuê thành công.", data: tenants });
  } catch (error) {
    return handleDatabaseError(error, res, "tải danh sách");
  }
});

// 3. POST /api/tenants - Thêm mới người thuê
router.post("/", authMiddleware, async (req, res) => {
  const { tenant, error } = validateTenant(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    if (!(await isTenantAccount(tenant.user_id))) {
      return res.status(400).json({
        message: "Chỉ có thể liên kết tài khoản khách thuê đang hoạt động.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO tenants (${tenantFields.join(", ")}) VALUES (${tenantFields
        .map(() => "?")
        .join(", ")})`,
      tenantFields.map((field) => tenant[field]),
    );

    const [rows] = await db.query(`${tenantSelect} WHERE t.tenant_id = ?`, [
      result.insertId,
    ]);
    return res
      .status(201)
      .json({ message: "Thêm khách thuê thành công.", data: rows[0] });
  } catch (dbError) {
    return handleDatabaseError(dbError, res, "thêm");
  }
});

// 4. PUT /api/tenants/:id - Cập nhật thông tin người thuê
router.put("/:id", authMiddleware, async (req, res) => {
  const tenantId = Number(req.params.id);
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return res.status(400).json({ message: "Mã khách thuê không hợp lệ." });
  }

  const { tenant, error } = validateTenant(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    if (!(await isTenantAccount(tenant.user_id))) {
      return res.status(400).json({
        message: "Chỉ có thể liên kết tài khoản khách thuê đang hoạt động.",
      });
    }

    const [result] = await db.query(
      `UPDATE tenants
       SET full_name = ?, date_of_birth = ?, identity_number = ?, phone = ?, email = ?, gender = ?, address = ?, contact_info = ?, user_id = ?
       WHERE tenant_id = ?`,
      [...tenantFields.map((field) => tenant[field]), tenantId],
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT tenant_id FROM tenants WHERE tenant_id = ?",
        [tenantId],
      );
      if (existing.length === 0)
        return res.status(404).json({ message: "Không tìm thấy khách thuê." });
    }

    const [rows] = await db.query(`${tenantSelect} WHERE t.tenant_id = ?`, [
      tenantId,
    ]);
    return res
      .status(200)
      .json({ message: "Cập nhật khách thuê thành công.", data: rows[0] });
  } catch (dbError) {
    return handleDatabaseError(dbError, res, "cập nhật");
  }
});

// 5. DELETE /api/tenants/:id - Xóa người thuê
router.delete("/:id", authMiddleware, async (req, res) => {
  const tenantId = Number(req.params.id);
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return res.status(400).json({ message: "Mã khách thuê không hợp lệ." });
  }

  try {
    const [result] = await db.query("DELETE FROM tenants WHERE tenant_id = ?", [
      tenantId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách thuê." });
    }
    return res.status(200).json({ message: "Đã xóa hồ sơ khách thuê." });
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message:
          "Không thể xóa khách thuê vì hồ sơ đang được dùng trong hợp đồng.",
      });
    }
    return handleDatabaseError(error, res, "xóa");
  }
});

module.exports = router;
