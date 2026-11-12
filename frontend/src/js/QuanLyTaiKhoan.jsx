import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiUserPlus,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiLock,
  FiUnlock,
} from "react-icons/fi";
import { useLogoutConfirmation } from "./XacNhanDangXuat";
import { getCurrentUser, isOwner } from "../PhanQuyen";
import "../css/TongQuan.css";
import "../css/QuanLyTaiKhoan.css";

const API_URL = "http://localhost:3000/api/users/staff";

function Employees() {
  const navigate = useNavigate();
  const requestLogout = useLogoutConfirmation();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
  });
  const owner = isOwner();

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Không thể tải danh sách nhân viên.");
      setStaff(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (owner) loadStaff();
  }, [owner, loadStaff]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify(form),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Không thể tạo tài khoản.");
      setStaff((current) =>
        editingId
          ? current.map((employee) =>
              employee.user_id === editingId
                ? { ...employee, ...result.data }
                : employee,
            )
          : [result.data, ...current],
      );
      setForm({ full_name: "", username: "", email: "", password: "" });
      setEditingId(null);
      setShowForm(false);
      setSuccess(
        result.message ||
          (editingId
            ? "Đã cập nhật tài khoản."
            : "Đã tạo tài khoản nhân viên."),
      );
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(employee) {
    setError("");
    setSuccess("");
    setEditingId(employee.user_id);
    setForm({
      full_name: employee.full_name || "",
      username: employee.username || "",
      email: employee.email || "",
      password: "",
    });
    setShowPassword(false);
    setShowForm(true);
  }

  async function toggleStatus(employee) {
    const nextStatus = employee.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_URL}/${employee.user_id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message || "Không thể cập nhật trạng thái tài khoản.",
        );
      setStaff((current) =>
        current.map((item) =>
          item.user_id === employee.user_id
            ? { ...item, status: nextStatus }
            : item,
        ),
      );
      setSuccess(result.message);
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ.");
    }
  }

  if (!owner) {
    return (
      <main className="employee-access-denied">
        <div>
          <FiUsers />
          <h1>Chỉ chủ trọ mới được quản lý nhân viên</h1>
          <button
            className="primary-btn"
            onClick={() => navigate("/dashboard")}
          >
            Về tổng quan
          </button>
        </div>
      </main>
    );
  }

  const user = getCurrentUser();

  return (
    <div className="dashboard-layout employees-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🏠</div>
          <h2>NHÀ TRỌ SÁU BÁ</h2>
        </div>
        <ul className="sidebar-menu">
          <li className="menu-item" onClick={() => navigate("/dashboard")}>
            <span>🏠</span> Tổng quan
          </li>
          <li className="menu-item" onClick={() => navigate("/rooms")}>
            <span>🚪</span> Quản lý phòng
          </li>
          <li className="menu-item" onClick={() => navigate("/tenants")}>
            <span>👥</span> Quản lý người thuê
          </li>
          <li className="menu-item" onClick={() => navigate("/contracts")}>
            <span>📄</span> Quản lý hợp đồng
          </li>
          <li className="menu-item" onClick={() => navigate("/payments")}>
            <span>💰</span> Quản lý thu tiền
          </li>
          <li className="menu-item" onClick={() => navigate("/services")}>
            <span>🛠️</span> Dịch vụ
          </li>
          <li className="menu-item active">
            <span>🧑‍💼</span> Quản lý tài khoản
          </li>
          <li className="menu-item">
            <span>⚙️</span> Cài đặt
          </li>
          <li className="menu-item logout-btn" onClick={requestLogout}>
            <span className="logout-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H19a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-5" />
                <polyline points="7 16 3 12 7 8" />
                <line x1="3" y1="12" x2="15" y2="12" />
              </svg>
            </span>{" "}
            Đăng xuất
          </li>
        </ul>
        <div className="sidebar-footer">
          <p>Uy tín - Tiện lợi - Hiệu quả</p>
        </div>
      </aside>

      <main className="main-content employees-main">
        <header className="page-header">
          <div>
            <h1>Quản lý tài khoản</h1>
            <p>Tạo và cập nhật tài khoản nhân viên trong hệ thống.</p>
          </div>
          <div className="user-badge">👤 {user?.fullName || "Chủ trọ"}</div>
        </header>

        <section className="employee-toolbar">
          <div>
            <div className="employee-toolbar-icon">
              <FiUsers />
            </div>
            <div>
              <h2>Tài khoản nhân viên</h2>
              <p>{staff.length} tài khoản đang có trong hệ thống</p>
            </div>
          </div>
          <div className="employee-toolbar-actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={loadStaff}
              disabled={loading}
            >
              <FiRefreshCw /> Làm mới
            </button>
            <button
              className="primary-btn"
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setEditingId(null);
                setForm({
                  full_name: "",
                  username: "",
                  email: "",
                  password: "",
                });
                setShowForm((value) => !value);
              }}
            >
              <FiUserPlus /> Tạo tài khoản
            </button>
          </div>
        </section>

        {error && (
          <div className="employee-message employee-error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="employee-message employee-success" role="status">
            {success}
          </div>
        )}

        {showForm && (
          <section className="employee-form-card">
            <div className="employee-form-heading">
              <div>
                <h2>
                  {editingId
                    ? "Cập nhật tài khoản nhân viên"
                    : "Tạo tài khoản nhân viên mới"}
                </h2>
                <p>
                  Nhân viên sẽ đăng nhập bằng tên tài khoản và mật khẩu bên
                  dưới.
                </p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({
                    full_name: "",
                    username: "",
                    email: "",
                    password: "",
                  });
                }}
              >
                Hủy
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <label>
                Họ và tên *
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={updateField}
                  maxLength="100"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </label>
              <label>
                Tên đăng nhập *
                <input
                  name="username"
                  value={form.username}
                  onChange={updateField}
                  minLength="3"
                  maxLength="50"
                  required
                  autoComplete="username"
                  placeholder="Ví dụ: nhanvien01"
                  disabled={Boolean(editingId)}
                />
                <small>
                  {editingId
                    ? "Tên đăng nhập không thể thay đổi."
                    : "3–50 ký tự; dùng chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang."}
                </small>
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  maxLength="254"
                  autoComplete="email"
                  placeholder="nhanvien@email.com"
                />
              </label>
              <label>
                {editingId ? "Mật khẩu mới (không bắt buộc)" : "Mật khẩu *"}
                <span className="employee-password">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={updateField}
                    minLength={form.password ? 8 : undefined}
                    maxLength="72"
                    required={!editingId}
                    autoComplete="new-password"
                    placeholder={
                      editingId
                        ? "Để trống nếu không đổi mật khẩu"
                        : "Ít nhất 8 ký tự"
                    }
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </span>
                <small>
                  {editingId
                    ? "Nếu nhập, mật khẩu mới cần từ 8 ký tự."
                    : "Mật khẩu cần từ 8 ký tự."}
                </small>
              </label>
              <div className="employee-form-footer">
                <p>
                  Vai trò được gán tự động: <strong>Nhân viên</strong>
                </p>
                <button className="primary-btn" type="submit" disabled={saving}>
                  {saving
                    ? "Đang lưu…"
                    : editingId
                      ? "Lưu thay đổi"
                      : "Tạo tài khoản nhân viên"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="employee-list-card">
          <div className="employee-list-heading">
            <h2>Danh sách tài khoản</h2>
            <span>{staff.length} tài khoản</span>
          </div>
          {loading ? (
            <div className="employee-empty">Đang tải danh sách…</div>
          ) : staff.length === 0 ? (
            <div className="employee-empty">
              <div className="employee-empty-icon">
                <FiUsers />
              </div>
              <h3>Chưa có tài khoản nhân viên</h3>
              <p>Tạo tài khoản đầu tiên để nhân viên có thể đăng nhập.</p>
              <button
                className="primary-btn"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    full_name: "",
                    username: "",
                    email: "",
                    password: "",
                  });
                  setShowForm(true);
                }}
              >
                <FiUserPlus /> Tạo tài khoản đầu tiên
              </button>
            </div>
          ) : (
            <div className="employee-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>NHÂN VIÊN</th>
                    <th>TÊN ĐĂNG NHẬP</th>
                    <th>EMAIL</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((employee) => (
                    <tr key={employee.user_id}>
                      <td>
                        <strong>{employee.full_name}</strong>
                      </td>
                      <td>{employee.username}</td>
                      <td>{employee.email || "Chưa cập nhật"}</td>
                      <td>
                        <span
                          className={`employee-status ${employee.status === "ACTIVE" ? "is-active" : "is-locked"}`}
                        >
                          {employee.status === "ACTIVE"
                            ? "Đang hoạt động"
                            : "Đã khóa"}
                        </span>
                      </td>
                      <td>
                        <div className="employee-row-actions">
                          <button
                            type="button"
                            className="employee-action-edit"
                            onClick={() => startEdit(employee)}
                            aria-label={`Sửa ${employee.username}`}
                            title="Sửa tài khoản"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className={
                              employee.status === "ACTIVE"
                                ? "employee-action-lock"
                                : "employee-action-unlock"
                            }
                            onClick={() => toggleStatus(employee)}
                            aria-label={
                              employee.status === "ACTIVE"
                                ? `Khóa ${employee.username}`
                                : `Mở khóa ${employee.username}`
                            }
                            title={
                              employee.status === "ACTIVE"
                                ? "Khóa tài khoản"
                                : "Mở khóa tài khoản"
                            }
                          >
                            {employee.status === "ACTIVE" ? (
                              <FiLock />
                            ) : (
                              <FiUnlock />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Employees;
