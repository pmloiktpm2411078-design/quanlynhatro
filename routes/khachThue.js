const express = require("express");
const db = require("../config/db");
const authMiddleware = require("./xacThuc");

const router = express.Router();

const TENANT_ROLE_ID = 2;

// Các trường thông tin của khách thuê
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

// Câu truy vấn lấy thông tin khách thuê
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
  LEFT JOIN contracts AS c
    ON c.tenant_id = t.tenant_id
    AND c.status = 'ACTIVE'
  LEFT JOIN rooms AS r ON r.room_id = c.room_id
`;

// ==================================================
// KIỂM TRA DỮ LIỆU KHÁCH THUÊ
// ==================================================

function validateTenant(body = {}) {
  const tenant = {
    full_name: String(body.full_name || "").trim(),
    date_of_birth: String(body.date_of_birth || "").trim(),
    identity_number: String(body.identity_number || "").trim(),
    phone: String(body.phone || "").trim(),
    email: String(body.email || "").trim() || null,
    gender: String(body.gender || "").trim() || null,
    address: String(body.address || "").trim(),
    contact_info: String(body.contact_info || "").trim() || null,

    user_id:
      body.user_id === "" || body.user_id === null || body.user_id === undefined
        ? null
        : Number(body.user_id),
  };

  // 1. Kiểm tra các trường bắt buộc
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

  // 2. Kiểm tra độ dài dữ liệu
  if (
    tenant.full_name.length > 150 ||
    tenant.address.length > 255 ||
    String(tenant.contact_info || "").length > 255 ||
    String(tenant.email || "").length > 254 ||
    String(tenant.gender || "").length > 20
  ) {
    return {
      error: "Một trong các thông tin nhập vào quá dài.",
    };
  }

  // 3. Kiểm tra số điện thoại
  if (!/^0\d{9}$/.test(tenant.phone)) {
    return {
      error:
        "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0. Ví dụ: 0912345678.",
    };
  }

  // 4. Kiểm tra CCCD hoặc CMND
  if (!/^(?:\d{9}|\d{12})$/.test(tenant.identity_number)) {
    return {
      error:
        "CCCD phải gồm đúng 12 chữ số hoặc CMND cũ phải gồm đúng 9 chữ số.",
    };
  }

  // 5. Kiểm tra email nếu người dùng có nhập
  if (tenant.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenant.email)) {
    return {
      error: "Email không đúng định dạng. Ví dụ: example@gmail.com.",
    };
  }

  // 6. Kiểm tra tài khoản liên kết
  if (
    tenant.user_id !== null &&
    (!Number.isInteger(tenant.user_id) || tenant.user_id <= 0)
  ) {
    return {
      error: "Tài khoản liên kết không hợp lệ.",
    };
  }

  // 7. Kiểm tra định dạng ngày sinh YYYY-MM-DD
  const dateMatch = tenant.date_of_birth.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    return {
      error: "Ngày sinh không đúng định dạng. Vui lòng nhập ngày hợp lệ.",
    };
  }

  const [, yearText, monthText, dayText] = dateMatch;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date = new Date(Date.UTC(year, month - 1, day));

  // Lấy ngày hiện tại
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Kiểm tra ngày có tồn tại và không lớn hơn ngày hiện tại
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date > today
  ) {
    return {
      error: "Ngày sinh không hợp lệ hoặc lớn hơn ngày hiện tại.",
    };
  }

  return { tenant };
}

// ==================================================
// KIỂM TRA TÀI KHOẢN KHÁCH THUÊ
// ==================================================

async function isTenantAccount(userId) {
  if (userId === null) {
    return true;
  }

  const [users] = await db.query(
    `SELECT user_id
     FROM users
     WHERE user_id = ?
       AND status = 'ACTIVE'
       AND role_id = ?
     LIMIT 1`,
    [userId, TENANT_ROLE_ID],
  );

  return users.length > 0;
}

// ==================================================
// XỬ LÝ LỖI DATABASE
// ==================================================

function handleDatabaseError(error, res, action) {
  console.error(`Lỗi ${action} khách thuê:`, {
    code: error.code,
    message: error.message,
    sqlMessage: error.sqlMessage,
  });

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "Thông tin bị trùng ở trường dữ liệu yêu cầu không trùng.",
      detail: error.sqlMessage || error.message,
    });
  }

  return res.status(500).json({
    message: `Không thể ${action} khách thuê.`,
    detail: error.sqlMessage || error.message,
  });
}

// ==================================================
// 1. GET /api/tenants/accounts
// LẤY DANH SÁCH TÀI KHOẢN KHÁCH THUÊ
// ==================================================

router.get("/accounts", authMiddleware, async (req, res) => {
  try {
    const [accounts] = await db.query(
      `SELECT user_id, username, full_name, email
       FROM users
       WHERE status = 'ACTIVE'
         AND role_id = ?
       ORDER BY full_name, username`,
      [TENANT_ROLE_ID],
    );

    return res.status(200).json({
      data: accounts,
    });
  } catch (error) {
    return handleDatabaseError(error, res, "tải tài khoản");
  }
});

// ==================================================
// 2. GET /api/tenants
// LẤY DANH SÁCH KHÁCH THUÊ VÀ TÌM KIẾM
// ==================================================

router.get("/", authMiddleware, async (req, res) => {
  const rawKeyword = String(req.query.keyword || "").trim();
  const keyword = `%${rawKeyword}%`;

  try {
    const querySQL = `
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
      LEFT JOIN contracts AS c
        ON c.tenant_id = t.tenant_id
        AND c.status = 'ACTIVE'
      LEFT JOIN rooms AS r ON r.room_id = c.room_id
      WHERE t.full_name LIKE ?
         OR t.phone LIKE ?
         OR t.identity_number LIKE ?
         OR r.room_code LIKE ?
         OR r.room_number LIKE ?
      ORDER BY t.tenant_id DESC
    `;

    const [tenants] = await db.query(querySQL, [
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
    ]);

    return res.status(200).json({
      message: "Lấy danh sách khách thuê thành công.",
      data: tenants,
    });
  } catch (error) {
    console.error("Lỗi MySQL API /api/tenants:", error);

    return res.status(500).json({
      message: "Không thể tải danh sách khách thuê.",
      error: error.message,
    });
  }
});
// ==================================================
// GET /api/tenants/:id
// LẤY CHI TIẾT MỘT KHÁCH THUÊ
// ==================================================

router.get("/:id", authMiddleware, async (req, res) => {
  const tenantId = Number(req.params.id);

  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return res.status(400).json({
      message: "Mã khách thuê không hợp lệ.",
    });
  }

  try {
    const [rows] = await db.query(`${tenantSelect} WHERE t.tenant_id = ?`, [
      tenantId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy khách thuê.",
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin khách thuê thành công.",
      data: rows[0],
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết khách thuê:", error);

    return res.status(500).json({
      message: "Không thể lấy thông tin khách thuê.",
    });
  }
});
// ==================================================
// 3. POST /api/tenants
// THÊM MỚI KHÁCH THUÊ
// ==================================================

router.post("/", authMiddleware, async (req, res) => {
  const { tenant, error } = validateTenant(req.body);

  if (error) {
    return res.status(400).json({
      message: error,
    });
  }

  try {
    // Kiểm tra tài khoản liên kết nếu có
    if (!(await isTenantAccount(tenant.user_id))) {
      return res.status(400).json({
        message: "Chỉ có thể liên kết tài khoản khách thuê đang hoạt động.",
      });
    }

    // Thêm khách thuê vào database
    const [result] = await db.query(
      `INSERT INTO tenants (${tenantFields.join(", ")})
       VALUES (${tenantFields.map(() => "?").join(", ")})`,
      tenantFields.map((field) => tenant[field]),
    );

    // Lấy lại thông tin khách thuê vừa thêm
    const [rows] = await db.query(`${tenantSelect} WHERE t.tenant_id = ?`, [
      result.insertId,
    ]);

    return res.status(201).json({
      message: "Thêm khách thuê thành công.",
      data: rows[0],
    });
  } catch (error) {
    return handleDatabaseError(error, res, "thêm");
  }
});

// ==================================================
// 4. PUT /api/tenants/:id
// CẬP NHẬT THÔNG TIN KHÁCH THUÊ
// ==================================================

router.put("/:id", authMiddleware, async (req, res) => {
  const tenantId = Number(req.params.id);

  // Kiểm tra mã khách thuê
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return res.status(400).json({
      message: "Mã người thuê không hợp lệ.",
    });
  }

  const { tenant, error } = validateTenant(req.body);

  if (error) {
    return res.status(400).json({
      message: error,
    });
  }

  try {
    // Kiểm tra hồ sơ khách thuê hiện tại
    const [existingRows] = await db.query(
      `SELECT tenant_id, user_id
       FROM tenants
       WHERE tenant_id = ?
       LIMIT 1`,
      [tenantId],
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy người thuê.",
      });
    }

    const oldUserId =
      existingRows[0].user_id == null ? null : Number(existingRows[0].user_id);

    // Chỉ kiểm tra tài khoản khi thay đổi tài khoản liên kết
    if (tenant.user_id !== oldUserId) {
      if (!(await isTenantAccount(tenant.user_id))) {
        return res.status(400).json({
          message:
            "Tài khoản mới phải đang hoạt động và có vai trò khách thuê.",
        });
      }
    }

    // Cập nhật thông tin khách thuê
    await db.query(
      `UPDATE tenants
       SET full_name = ?,
           date_of_birth = ?,
           identity_number = ?,
           phone = ?,
           email = ?,
           gender = ?,
           address = ?,
           contact_info = ?,
           user_id = ?
       WHERE tenant_id = ?`,
      [
        tenant.full_name,
        tenant.date_of_birth,
        tenant.identity_number,
        tenant.phone,
        tenant.email,
        tenant.gender,
        tenant.address,
        tenant.contact_info,
        tenant.user_id,
        tenantId,
      ],
    );

    // Lấy lại thông tin sau khi cập nhật
    const [rows] = await db.query(`${tenantSelect} WHERE t.tenant_id = ?`, [
      tenantId,
    ]);

    return res.status(200).json({
      message: "Cập nhật người thuê thành công.",
      data: rows[0],
    });
  } catch (error) {
    return handleDatabaseError(error, res, "cập nhật");
  }
});

// ==================================================
// 5. DELETE /api/tenants/:id
// XÓA HỒ SƠ KHÁCH THUÊ
// ==================================================

router.delete("/:id", authMiddleware, async (req, res) => {
  const tenantId = Number(req.params.id);

  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return res.status(400).json({
      message: "Mã khách thuê không hợp lệ.",
    });
  }

  try {
    const [result] = await db.query("DELETE FROM tenants WHERE tenant_id = ?", [
      tenantId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Không tìm thấy khách thuê.",
      });
    }

    return res.status(200).json({
      message: "Đã xóa hồ sơ khách thuê.",
    });
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message:
          "Không thể xóa khách thuê vì hồ sơ đang được sử dụng trong hợp đồng.",
      });
    }

    return handleDatabaseError(error, res, "xóa");
  }
});

module.exports = router;
