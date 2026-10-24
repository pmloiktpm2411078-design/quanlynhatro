import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import "../css/DangNhap.css";
import "../css/QuenMatKhau.css";

const API_URL = "http://localhost:3000/api/password";

function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("request");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  async function handleRequestOtp(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: email.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không gửi được mã OTP.");

      setStep("reset");
      setMessage(result.message || "Nếu tài khoản và email khớp, mã OTP sẽ được gửi đến hộp thư của bạn.");
      setMessageType("info");
    } catch (error) {
      setMessage(error.message || "Không thể kết nối đến máy chủ.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("Mật khẩu mới cần có ít nhất 8 ký tự.");
      setMessageType("error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận chưa khớp.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), otp: otp.trim(), newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể đặt lại mật khẩu.");

      setStep("complete");
      setMessage(result.message || "Đặt lại mật khẩu thành công.");
      setMessageType("success");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(error.message || "Không thể kết nối đến máy chủ.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page-wrapper">
      <main className="login-main-container forgot-password-main">
        <div className="login-left-content">
          <h2>
            KHÔI PHỤC TÀI KHOẢN
            <br />
            <span>Nhà trọ Sáu Bá</span>
          </h2>
          <p>Đặt lại mật khẩu để tiếp tục quản lý nhà trọ của bạn.</p>
        </div>

        <section className="login-right-box forgot-password-box">
          <h3>{step === "complete" ? "HOÀN TẤT" : "ĐẶT LẠI MẬT KHẨU"}</h3>
          <p className="login-subtitle">
            {step === "request" ? "Nhận mã OTP qua email đã đăng ký" : step === "reset" ? `Nhập mã OTP đã gửi đến ${email}` : "Mật khẩu của bạn đã được cập nhật"}
          </p>

          {step !== "complete" && (
            <div className="forgot-password-notice">
              Email phải được đăng ký trong tài khoản. Mã OTP có hiệu lực 10 phút.
            </div>
          )}

          {message && <p className={`forgot-password-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>{message}</p>}

          {step === "request" && (
            <form onSubmit={handleRequestOtp}>
              <div className="login-input-group">
                <label>Tên đăng nhập</label>
                <div className="login-input-wrapper">
                  <FaUser className="login-input-icon" />
                  <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" autoComplete="username" required />
                </div>
              </div>
              <div className="login-input-group">
                <label>Email đã đăng ký</label>
                <div className="login-input-wrapper">
                  <FaEnvelope className="login-input-icon" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@example.com" autoComplete="email" required />
                </div>
              </div>
              <button type="submit" className="login-submit-btn" disabled={loading}>{loading ? "Đang gửi mã..." : "Gửi mã OTP"}</button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword}>
              <div className="login-input-group">
                <label>Mã OTP 6 chữ số</label>
                <div className="login-input-wrapper">
                  <FaLock className="login-input-icon" />
                  <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Nhập mã trong email" required />
                </div>
              </div>
              <div className="login-input-group">
                <label>Mật khẩu mới</label>
                <div className="login-input-wrapper">
                  <FaLock className="login-input-icon" />
                  <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Ít nhất 8 ký tự" required />
                </div>
              </div>
              <div className="login-input-group">
                <label>Nhập lại mật khẩu mới</label>
                <div className="login-input-wrapper">
                  <FaLock className="login-input-icon" />
                  <input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu mới" required />
                </div>
              </div>
              <button type="submit" className="login-submit-btn" disabled={loading}>{loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}</button>
              <button type="button" className="forgot-change-email" onClick={() => { setStep("request"); setOtp(""); setMessage(""); }}>Dùng tài khoản/email khác</button>
            </form>
          )}

          {step === "complete" && <Link className="forgot-login-button" to="/">Quay lại đăng nhập</Link>}
          {step !== "complete" && <p className="forgot-password-back"><Link to="/">← Quay lại đăng nhập</Link></p>}
        </section>
      </main>
    </div>
  );
}

export default ForgotPassword;
