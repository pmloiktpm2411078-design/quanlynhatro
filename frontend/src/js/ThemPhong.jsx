import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogoutConfirmation } from "./XacNhanDangXuat";
import { isOwner } from "../PhanQuyen";
import "../css/TongQuan.css";
import "../css/ThemPhong.css";

function AddRoom() {
  const navigate = useNavigate();
  const requestLogout = useLogoutConfirmation();

  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    room_code: "",
    room_number: "",
    room_type_id: "",
    area_m2: "",
    listed_rent: "",
    description: "",
  });

  // Lấy danh sách loại phòng từ Backend
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/");
          return;
        }

        const response = await fetch("http://localhost:3000/api/room-types", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Không thể lấy danh sách loại phòng.",
          );
        }

        setRoomTypes(result.data || []);
      } catch (err) {
        setError(err.message || "Không thể kết nối đến máy chủ.");
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchRoomTypes();
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.room_code.trim() ||
      !form.room_number.trim() ||
      !form.room_type_id ||
      form.listed_rent === ""
    ) {
      setError("Vui lòng nhập đầy đủ các thông tin bắt buộc.");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Không thể thêm phòng.");
      }

      setSuccess("Thêm phòng thành công!");

      alert("Thêm phòng thành công!");

      navigate("/rooms");
    } catch (err) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🏠</div>
          <div>
            <h2>NHÀ TRỌ SÁU BÁ</h2>
          </div>
        </div>

        <ul className="sidebar-menu">
          <li
            className="menu-item"
            onClick={() => navigate(isOwner() ? "/dashboard" : "/employee")}
          >
            <span>🏠</span> Tổng quan
          </li>
          <li className="menu-item active">
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
          {isOwner() && (
            <li className="menu-item" onClick={() => navigate("/employees")}>
              <span>🧑‍💼</span> Quản lý tài khoản
            </li>
          )}
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
                <path d="M14 2H19a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-5"></path>
                <polyline points="7 16 3 12 7 8"></polyline>
                <line x1="3" y1="12" x2="15" y2="12"></line>
              </svg>
            </span>{" "}
            Đăng xuất
          </li>
        </ul>

        <div className="sidebar-footer">
          <p>Uy tín - Tiện lợi - Hiệu quả</p>
        </div>
      </aside>

      <main className="main-content add-room-main">
        <header className="main-header add-room-header">
          <div>
            <h1>Thêm phòng mới</h1>
            <p>Tạo phòng mới và cập nhật vào hệ thống quản lý.</p>
          </div>
          <div className="header-right">
            <div className="date-filter">
              <span>📅 Tháng 10, 2026</span>
            </div>
            <div className="user-profile">
              <span>👤 Quản trị viên</span>
            </div>
          </div>
        </header>

        <section className="add-room-card">
          <div className="add-room-card-heading">
            <div>
              <span className="add-room-eyebrow">THÔNG TIN PHÒNG</span>
              <h2>Chi tiết phòng</h2>
              <p>Điền các thông tin cần thiết để tạo phòng mới.</p>
            </div>
            <button
              className="add-room-back-button"
              type="button"
              onClick={() => navigate("/rooms")}
            >
              <span aria-hidden="true">←</span> Danh sách phòng
            </button>
          </div>

          {error && roomTypes.length > 0 && (
            <div className="add-room-error" role="alert">
              {error}
            </div>
          )}

          {loadingTypes && (
            <div
              className="add-room-notice add-room-notice--loading"
              role="status"
            >
              Đang tải danh sách loại phòng...
            </div>
          )}

          {!loadingTypes && roomTypes.length === 0 && (
            <div
              className="add-room-notice add-room-notice--warning"
              role="status"
            >
              <div className="add-room-notice-copy">
                <strong>
                  {error ? "Chưa tải được loại phòng" : "Chưa có loại phòng"}
                </strong>
                <p>
                  {error
                    ? "Bạn vẫn có thể nhập thông tin phòng. Hãy kiểm tra kết nối máy chủ hoặc thêm loại phòng trước khi lưu."
                    : "Bạn vẫn có thể nhập thông tin phòng. Hãy thêm loại phòng trước khi lưu."}
                </p>
              </div>
              <button
                className="add-room-create-type-button"
                type="button"
                onClick={() => navigate("/room-types/add")}
              >
                + Thêm loại phòng
              </button>
            </div>
          )}

          {success && (
            <div className="add-room-success" role="status">
              {success}
            </div>
          )}

          <form className="add-room-form" onSubmit={handleSubmit}>
            <div className="add-room-fields">
              <label className="add-room-field">
                <span>
                  Mã phòng <b>*</b>
                </span>
                <input
                  name="room_code"
                  value={form.room_code}
                  onChange={handleChange}
                  placeholder="Ví dụ: P103"
                  maxLength={30}
                  required
                />
              </label>

              <label className="add-room-field">
                <span>
                  Số phòng <b>*</b>
                </span>
                <input
                  name="room_number"
                  value={form.room_number}
                  onChange={handleChange}
                  placeholder="Ví dụ: 103"
                  maxLength={30}
                  required
                />
              </label>

              <label className="add-room-field">
                <span>
                  Loại phòng <b>*</b>
                </span>
                <select
                  name="room_type_id"
                  value={form.room_type_id}
                  onChange={handleChange}
                  required
                  disabled={roomTypes.length === 0}
                >
                  <option value="">-- Chọn loại phòng --</option>
                  {roomTypes.map((type) => (
                    <option key={type.room_type_id} value={type.room_type_id}>
                      {type.type_code} - {type.type_name}
                    </option>
                  ))}
                </select>
                <button
                  className="add-room-inline-link"
                  type="button"
                  onClick={() => navigate("/room-types/add")}
                >
                  + Tạo loại phòng mới
                </button>
              </label>

              <label className="add-room-field">
                <span>
                  Diện tích <small>(m²)</small>
                </span>
                <input
                  type="number"
                  name="area_m2"
                  value={form.area_m2}
                  onChange={handleChange}
                  placeholder="Ví dụ: 20"
                  min="0.01"
                  step="0.01"
                />
              </label>

              <label className="add-room-field">
                <span>
                  Giá thuê mỗi tháng <small>(VNĐ)</small> <b>*</b>
                </span>
                <input
                  type="number"
                  name="listed_rent"
                  value={form.listed_rent}
                  onChange={handleChange}
                  placeholder="Ví dụ: 1.500.000"
                  min="0"
                  step="1"
                  required
                />
              </label>

              <label className="add-room-field add-room-field--wide">
                <span>
                  Mô tả phòng <small>(không bắt buộc)</small>
                </span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Mô tả tiện nghi hoặc đặc điểm của phòng..."
                  rows={4}
                />
              </label>
            </div>

            <div className="add-room-form-actions">
              <p>
                <b>*</b> Thông tin bắt buộc
              </p>
              <div>
                <button
                  className="add-room-cancel-button"
                  type="button"
                  onClick={() => navigate("/rooms")}
                >
                  Hủy
                </button>
                <button
                  className="add-room-submit-button"
                  type="submit"
                  disabled={
                    submitting || loadingTypes || roomTypes.length === 0
                  }
                >
                  {submitting ? "Đang lưu..." : "Lưu phòng"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default AddRoom;
