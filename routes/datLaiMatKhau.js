const express = require("express");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const db = require("../config/db");

const router = express.Router();
const OTP_LIFETIME_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const requestCooldowns = new Map();

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function hashOtp(username, otp) {
  return crypto
    .createHmac("sha256", process.env.PASSWORD_RESET_SECRET)
    .update(`${username}:${otp}`)
    .digest("hex");
}

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(left || "") || !/^[a-f0-9]{64}$/i.test(right || "")) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

router.post("/forgot", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const genericMessage = "Nếu tên đăng nhập và email khớp, mã OTP sẽ được gửi đến email đã đăng ký.";

  if (!username || !email || username.length > 191 || email.length > 254) {
    return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và email hợp lệ." });
  }

  if (!process.env.PASSWORD_RESET_SECRET || process.env.PASSWORD_RESET_SECRET.length < 32) {
    return res.status(503).json({ message: "Chức năng OTP chưa được cấu hình an toàn trên máy chủ." });
  }

  const transporter = createTransporter();
  if (!transporter) {
    return res.status(503).json({ message: "Máy chủ chưa được cấu hình gửi email OTP." });
  }

  const now = Date.now();
  const ip = req.ip || "unknown";
  const lastRequest = requestCooldowns.get(ip) || 0;
  if (now - lastRequest < OTP_RESEND_SECONDS * 1000) {
    return res.status(202).json({ message: genericMessage });
  }
  requestCooldowns.set(ip, now);

  try {
    const [users] = await db.query(
      `SELECT username, email
       FROM users
       WHERE username = ? AND LOWER(email) = ?
       LIMIT 1`,
      [username, email],
    );

    if (users.length === 0) {
      return res.status(202).json({ message: genericMessage });
    }

    const [existing] = await db.query(
      "SELECT sent_at FROM password_reset_otps WHERE username = ? LIMIT 1",
      [username],
    );
    if (existing.length > 0 && now - new Date(existing[0].sent_at).getTime() < OTP_RESEND_SECONDS * 1000) {
      return res.status(202).json({ message: genericMessage });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = hashOtp(username, otp);
    await db.query(
      `INSERT INTO password_reset_otps (username, otp_hash, expires_at, sent_at, attempts)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW(), 0)
       ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), sent_at = VALUES(sent_at), attempts = 0`,
      [username, otpHash, OTP_LIFETIME_MINUTES],
    );

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: users[0].email,
        subject: "Mã OTP đặt lại mật khẩu - Nhà trọ Sáu Bá",
        text: `Mã OTP của bạn là ${otp}. Mã có hiệu lực trong ${OTP_LIFETIME_MINUTES} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`,
        html: `<p>Mã OTP đặt lại mật khẩu của bạn:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>Mã có hiệu lực trong ${OTP_LIFETIME_MINUTES} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>`,
      });
    } catch (mailError) {
      await db.query("DELETE FROM password_reset_otps WHERE username = ?", [username]);
      console.error("Không gửi được email OTP:", mailError.code || mailError.message);
      return res.status(503).json({ message: "Không gửi được email OTP. Vui lòng kiểm tra cấu hình email máy chủ." });
    }

    return res.status(202).json({ message: genericMessage });
  } catch (error) {
    console.error("Lỗi yêu cầu đặt lại mật khẩu:", error.code || error.message);
    return res.status(500).json({ message: "Không thể xử lý yêu cầu đặt lại mật khẩu." });
  }
});

router.post("/reset", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const otp = String(req.body.otp || "").trim();
  const newPassword = String(req.body.newPassword || "");

  if (!username || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "Tên đăng nhập hoặc mã OTP không hợp lệ." });
  }
  if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) {
    return res.status(400).json({ message: "Mật khẩu cần có ít nhất 8 ký tự và tối đa 72 byte." });
  }
  if (!process.env.PASSWORD_RESET_SECRET || process.env.PASSWORD_RESET_SECRET.length < 32) {
    return res.status(503).json({ message: "Chức năng OTP chưa được cấu hình an toàn trên máy chủ." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [records] = await connection.query(
      "SELECT otp_hash, expires_at, attempts FROM password_reset_otps WHERE username = ? FOR UPDATE",
      [username],
    );
    if (records.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Mã OTP không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới." });
    }

    const record = records[0];
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await connection.query("DELETE FROM password_reset_otps WHERE username = ?", [username]);
      await connection.commit();
      return res.status(400).json({ message: "Mã OTP đã hết hạn. Hãy yêu cầu mã mới." });
    }

    const providedHash = hashOtp(username, otp);
    if (record.attempts >= OTP_MAX_ATTEMPTS || !safeEqualHex(record.otp_hash, providedHash)) {
      if (record.attempts + 1 >= OTP_MAX_ATTEMPTS) {
        await connection.query("DELETE FROM password_reset_otps WHERE username = ?", [username]);
      } else {
        await connection.query("UPDATE password_reset_otps SET attempts = attempts + 1 WHERE username = ?", [username]);
      }
      await connection.commit();
      return res.status(400).json({ message: "Mã OTP không đúng hoặc đã hết hạn. Hãy kiểm tra lại mã." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const [result] = await connection.query(
      "UPDATE users SET password_hash = ? WHERE username = ?",
      [passwordHash, username],
    );
    if (result.affectedRows !== 1) {
      await connection.rollback();
      return res.status(400).json({ message: "Không thể đặt lại mật khẩu cho tài khoản này." });
    }

    await connection.query("DELETE FROM password_reset_otps WHERE username = ?", [username]);
    await connection.commit();
    return res.status(200).json({ message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi đặt lại mật khẩu:", error.code || error.message);
    return res.status(500).json({ message: "Không thể đặt lại mật khẩu lúc này." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
