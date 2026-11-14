const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./config/db");
const roomsRouter = require("./routes/quanLyPhong");
const passwordResetRouter = require("./routes/datLaiMatKhau");
const tenantsRouter = require("./routes/khachThue");
const contractsRouter = require("./routes/hopDong");
const paymentsRouter = require("./routes/thuTien");
const servicesRouter = require("./routes/dichVu");
const usersRouter = require("./routes/taiKhoan");
const giuPhongRoute = require("./routes/giuPhong");
const app = express();
const batDauXuLyGiuPhongHetHan = require("./jobs/xuLyGiuPhongHetHan");
app.use(cors());
app.use(express.json());
app.use("/api/rooms", roomsRouter);
app.use("/api/password", passwordResetRouter);
app.use("/api/tenants", tenantsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/users", usersRouter);
app.use("/api/giu-phong", giuPhongRoute);
// Khóa bí mật để tạo Token (Trong thực tế nên lưu vào file .env)
const SECRET_KEY = "khoa_bi_mat_cua_he_thong_nha_tro";

// -----------------------------------------------------
// API 1: ĐĂNG NHẬP (Lấy Token)
// -----------------------------------------------------
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Tìm user trong database
    const [users] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (users.length === 0) {
      return res
        .status(401)
        .json({ message: "Sai tên đăng nhập hoặc mật khẩu!" });
    }

    const user = users[0];

    // 2. Kiểm tra tài khoản có bị khóa không (UC-USER-02)
    if (user.status === "LOCKED") {
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa!" });
    }

    // Hỗ trợ tài khoản cũ lưu mật khẩu dạng chữ thường và mật khẩu mới đã băm bằng bcrypt.
    const isBcryptHash = /^\$2[aby]\$/.test(user.password_hash || "");
    const isPasswordValid = isBcryptHash
      ? await bcrypt.compare(password, user.password_hash)
      : password === user.password_hash;
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Sai tên đăng nhập hoặc mật khẩu!" });
    }

    // 4. Tạo JWT Token chứa thông tin user và role_id
    const token = jwt.sign(
      { userId: user.user_id, roleId: user.role_id, username: user.username },
      SECRET_KEY,
      { expiresIn: "8h" }, // Token có hạn 8 tiếng
    );

    res.json({
      message: "Đăng nhập thành công!",
      token: token,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        roleId: user.role_id,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi hệ thống!" });
  }
});
// API lấy danh sách loại phòng
app.get("/api/room-types", async (req, res) => {
  try {
    const [types] = await db.query(`
      SELECT
        room_type_id,
        type_code,
        type_name,
        description
      FROM room_types
      ORDER BY room_type_id ASC
    `);

    res.status(200).json({
      message: "Lấy danh sách loại phòng thành công",
      total: types.length,
      data: types,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách loại phòng:", error);

    res.status(500).json({
      message: "Không thể lấy danh sách loại phòng",
    });
  }
});

// Khởi chạy server

app.listen(3000, () => {
  console.log("Server đang chạy tại: http://localhost:3000");

  // Khởi động bộ xử lý phiếu giữ phòng hết hạn
  batDauXuLyGiuPhongHetHan();
});
