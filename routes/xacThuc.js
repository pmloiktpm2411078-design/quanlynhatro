const jwt = require("jsonwebtoken");

// Phải sử dụng cùng khóa bí mật với mayChu.js
const SECRET_KEY = "khoa_bi_mat_cua_he_thong_nha_tro";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Bạn chưa đăng nhập hoặc token không hợp lệ.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    req.user = {
      userId: decoded.userId,
      roleId: decoded.roleId,
      username: decoded.username,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Phiên đăng nhập hết hạn hoặc token không hợp lệ.",
    });
  }
}

module.exports = authMiddleware;
