import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { isOwner } from "../PhanQuyen";
import "../css/TongQuan.css";
import "../css/QuanLyKhachThue.css";
const API_URL = "http://localhost:3000/api/tenants";
// Chuyển yyyy-MM-dd thành dd/MM/yyyy để hiển thị
const formatDateVN = (date) => {
  if (!date) return "";

  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return date;

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

// Chuyển dd/MM/yyyy thành yyyy-MM-dd để gửi Backend
const formatDateISO = (date) => {
  if (!date) return "";

  const match = String(date).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) return date;

  const [, day, month, year] = match;

  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    parsedDate.getFullYear() !== Number(year) ||
    parsedDate.getMonth() !== Number(month) - 1 ||
    parsedDate.getDate() !== Number(day)
  ) {
    return date;
  }

  return `${year}-${month}-${day}`;
};
const emptyTenantForm = {
  full_name: "",
  date_of_birth: "",
  identity_number: "",
  phone: "",
  email: "",
  gender: "",
  address: "",
  contact_info: "",
  user_id: null,
};

function Tenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [tenantForm, setTenantForm] = useState({ ...emptyTenantForm });
  const [savingTenant, setSavingTenant] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/tenants", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Không thể tải danh sách người thuê.",
        );
      }

      setTenants(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách khách thuê:", err);
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };
  // Mở form thêm người thuê
  const openAddTenantForm = () => {
    setEditingTenant(null);
    setTenantForm({ ...emptyTenantForm });
    setFormError("");
    setSuccessMessage("");
    setShowTenantForm(true);
  };

  // Mở form sửa người thuê
  const openEditTenantForm = (tenant) => {
    setEditingTenant(tenant);

    setTenantForm({
      ...emptyTenantForm,
      full_name: tenant.full_name || "",
      date_of_birth: formatDateVN(tenant.date_of_birth || ""),
      identity_number: tenant.identity_number || "",
      phone: tenant.phone || "",
      email: tenant.email || "",
      gender: tenant.gender || "",
      address: tenant.address || "",
      contact_info: tenant.contact_info || "",
      user_id: tenant.user_id || null,
    });
    setFormError("");
    setSuccessMessage("");
    setShowTenantForm(true);
  };

  // Cập nhật giá trị khi nhập form
  const handleTenantFormChange = (event) => {
    const { name, value } = event.target;

    setTenantForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Lưu người thuê mới hoặc cập nhật người thuê
  const handleSaveTenant = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    // Lấy dữ liệu đã loại bỏ khoảng trắng thừa
    const fullName = tenantForm.full_name.trim();
    const dateOfBirth = tenantForm.date_of_birth.trim();
    const identityNumber = tenantForm.identity_number.trim();
    const phone = tenantForm.phone.trim();
    const email = tenantForm.email.trim();
    const address = tenantForm.address.trim();

    // 1. Kiểm tra họ tên
    if (!fullName) {
      setFormError("Vui lòng nhập họ và tên người thuê.");
      return;
    }

    // 2. Kiểm tra ngày sinh dd/MM/yyyy
    const dateMatch = dateOfBirth.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!dateMatch) {
      setFormError(
        "Ngày sinh không đúng định dạng. Vui lòng nhập theo dạng dd/MM/yyyy. Ví dụ: 15/06/2000.",
      );
      return;
    }

    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const year = Number(dateMatch[3]);

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day
    ) {
      setFormError("Ngày sinh không tồn tại. Vui lòng kiểm tra lại.");
      return;
    }

    if (birthDate > today) {
      setFormError("Ngày sinh không được lớn hơn ngày hiện tại.");
      return;
    }

    // 3. Kiểm tra CCCD/CMND
    if (!/^(?:\d{9}|\d{12})$/.test(identityNumber)) {
      setFormError(
        "CCCD phải có đúng 12 chữ số hoặc CMND cũ phải có đúng 9 chữ số.",
      );
      return;
    }

    // 4. Kiểm tra số điện thoại
    if (!/^0\d{9}$/.test(phone)) {
      setFormError(
        "Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng số 0. Ví dụ: 0912345678.",
      );
      return;
    }

    // 5. Kiểm tra email nếu có nhập
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Email không đúng định dạng. Ví dụ: example@gmail.com.");
      return;
    }

    // 6. Kiểm tra địa chỉ
    if (!address) {
      setFormError("Vui lòng nhập địa chỉ người thuê.");
      return;
    }

    if (address.length > 255) {
      setFormError("Địa chỉ không được vượt quá 255 ký tự.");
      return;
    }

    if (fullName.length > 150) {
      setFormError("Họ và tên không được vượt quá 150 ký tự.");
      return;
    }

    setSavingTenant(true);

    try {
      const token = localStorage.getItem("token");
      const isEditing = Boolean(editingTenant);

      const response = await fetch(
        isEditing ? `${API_URL}/${editingTenant.tenant_id}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ...tenantForm,
            full_name: fullName,
            date_of_birth: formatDateISO(dateOfBirth),
            identity_number: identityNumber,
            phone: phone,
            email: email || null,
            address: address,
            gender: tenantForm.gender || null,
            contact_info: tenantForm.contact_info.trim() || null,
            user_id: tenantForm.user_id || null,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        const message = [result.message, result.detail, result.error]
          .filter(Boolean)
          .join(" - ");

        throw new Error(message || "Không thể lưu thông tin người thuê.");
      }

      setShowTenantForm(false);
      setEditingTenant(null);
      setTenantForm({ ...emptyTenantForm });

      setSuccessMessage(
        result.message ||
          (isEditing
            ? "Cập nhật người thuê thành công."
            : "Thêm người thuê thành công."),
      );

      await fetchTenants();
    } catch (error) {
      setFormError(error.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setSavingTenant(false);
    }
  };
  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;
    setActionError("");
    setDeletingId(tenantToDelete.tenant_id);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/tenants/${tenantToDelete.tenant_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Không thể xóa người thuê.");
      }

      setTenants((prev) =>
        prev.filter((item) => item.tenant_id !== tenantToDelete.tenant_id),
      );
      setTenantToDelete(null);
    } catch (err) {
      setActionError(err.message || "Lỗi khi xóa người thuê.");
    } finally {
      setDeletingId(null);
    }
  };

  // Logic lọc trực tiếp phía Client (Khớp 100% với hiển thị bảng)
  const filteredTenants = tenants.filter((tenant) => {
    if (!searchTerm.trim()) return true;
    const kw = searchTerm.toLowerCase().trim();

    const name = String(tenant.full_name || "").toLowerCase();
    const phone = String(tenant.phone || "").toLowerCase();
    const identity = String(tenant.identity_number || "").toLowerCase();
    const room = String(
      tenant.room_code || tenant.room_number || "",
    ).toLowerCase();
    const address = String(tenant.address || "").toLowerCase();

    return (
      name.includes(kw) ||
      phone.includes(kw) ||
      identity.includes(kw) ||
      room.includes(kw) ||
      address.includes(kw)
    );
  });

  return (
    <div className="dashboard-layout tenant-dark-theme">
      {/* SIDEBAR BÊN TRÁI */}
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
          <li className="menu-item" onClick={() => navigate("/rooms")}>
            <span>🚪</span> Quản lý phòng
          </li>
          <li className="menu-item active">
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
        </ul>
      </aside>

      {/* NỘI DUNG CHÍNH BÊN PHẢI */}
      <main className="main-content tenant-management-page">
        {" "}
        <header className="main-header">
          <div>
            <h1>Quản lý người thuê</h1>
            <p>Danh sách và thông tin chi tiết khách thuê trọ</p>
          </div>
        </header>
        {/* THỐNG KÊ NGƯỜI THUÊ */}
        <div className="tenant-stats-grid">
          <div className="tenant-stat-card">
            <div className="tenant-stat-label">Tổng người thuê</div>
            <div className="tenant-stat-value">{tenants.length}</div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-label">Đang có phòng</div>
            <div className="tenant-stat-value tenant-stat-blue">
              {tenants.filter((t) => t.room_code || t.room_number).length}
            </div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-label">Chưa xếp phòng</div>
            <div className="tenant-stat-value tenant-stat-green">
              {tenants.filter((t) => !t.room_code && !t.room_number).length}
            </div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-label">Có tài khoản liên kết</div>
            <div className="tenant-stat-value tenant-stat-orange">
              {tenants.filter((t) => t.user_id != null).length}
            </div>
          </div>
        </div>
        <div className="room-management-container">
          {/* Thanh tìm kiếm và nút Thêm mới */}
          <div className="room-toolbar">
            <div className="filter-group">
              <input
                type="text"
                placeholder="🔍 Tìm theo Tên, SĐT, CCCD, Phòng, Địa chỉ..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="btn-add-room" onClick={openAddTenantForm}>
              + Thêm người thuê
            </button>
          </div>
          {successMessage && (
            <div
              className="tenant-feedback tenant-feedback-success"
              role="status"
            >
              {successMessage}
            </div>
          )}
          {/* Bảng dữ liệu người thuê */}
          <div className="room-table-card">
            {successMessage && (
              <div
                className="tenant-feedback tenant-feedback-success"
                role="status"
              >
                {successMessage}
              </div>
            )}
            <div className="table-header-title">Danh sách người thuê</div>

            {loading && (
              <p style={{ padding: "20px", color: "#fff" }}>
                Đang tải danh sách người thuê...
              </p>
            )}

            {error && (
              <div
                style={{
                  padding: "12px",
                  margin: "16px",
                  color: "#b91c1c",
                  backgroundColor: "#fee2e2",
                  borderRadius: "6px",
                }}
              >
                {error}
              </div>
            )}

            {!loading && !error && (
              <div style={{ overflowX: "auto" }}>
                <table className="rooms-table-modern">
                  <thead>
                    <tr>
                      <th>HỌ TÊN KHÁCH</th>
                      <th>SỐ ĐIỆN THOẠI</th>
                      <th>CCCD/CMND</th>
                      <th>PHÒNG ĐANG Ở</th>
                      <th>ĐỊA CHỈ THƯỜNG TRÚ</th>
                      <th style={{ textAlign: "center" }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          style={{
                            textAlign: "center",
                            padding: "30px",
                            color: "#9ca3af",
                          }}
                        >
                          {searchTerm
                            ? `Không tìm thấy khách thuê phù hợp với từ khóa "${searchTerm}".`
                            : "Chưa có dữ liệu người thuê trong cơ sở dữ liệu."}
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((item) => (
                        <tr key={item.tenant_id}>
                          <td>
                            <Link
                              to={`/tenants/${item.tenant_id}`}
                              className="tenant-name-link"
                              title="Xem thông tin chi tiết khách thuê"
                            >
                              {item.full_name}
                            </Link>
                          </td>
                          <td>{item.phone || "---"}</td>
                          <td>{item.identity_number || "---"}</td>
                          <td>
                            <span
                              style={{
                                padding: "4px 8px",
                                backgroundColor:
                                  item.room_code || item.room_number
                                    ? "#3b82f620"
                                    : "#6b728020",
                                color:
                                  item.room_code || item.room_number
                                    ? "#60a5fa"
                                    : "#9ca3af",
                                borderRadius: "4px",
                                fontWeight: "bold",
                              }}
                            >
                              {item.room_code ||
                                item.room_number ||
                                "Chưa xếp phòng"}
                            </span>
                          </td>
                          <td>{item.address || "---"}</td>
                          <td className="room-row-actions">
                            <button
                              type="button"
                              className="btn-action-edit"
                              title="Sửa thông tin"
                              onClick={() => openEditTenantForm(item)}
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              className="btn-action-delete"
                              title="Xóa người thuê"
                              onClick={() => {
                                setTenantToDelete(item);
                                setActionError("");
                              }}
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="table-footer">
              <span>
                Hiển thị {filteredTenants.length} / {tenants.length} người thuê
              </span>
            </div>
          </div>
        </div>
      </main>
      {/* FORM THÊM / SỬA NGƯỜI THUÊ */}
      {showTenantForm && (
        <div
          className="tenant-form-overlay"
          onClick={() => {
            if (!savingTenant) setShowTenantForm(false);
          }}
        >
          <div
            className="tenant-form-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>
              {editingTenant ? "Chỉnh sửa người thuê" : "Thêm người thuê"}
            </h2>

            <form onSubmit={handleSaveTenant} noValidate>
              <label>
                Họ và tên *
                <input
                  name="full_name"
                  type="text"
                  value={tenantForm.full_name}
                  onChange={handleTenantFormChange}
                  maxLength={150}
                />
              </label>

              <label>
                Ngày sinh *
                <input
                  name="date_of_birth"
                  type="text"
                  placeholder="dd/MM/yyyy"
                  value={tenantForm.date_of_birth}
                  onChange={handleTenantFormChange}
                />
              </label>

              <label>
                CCCD/CMND *
                <input
                  name="identity_number"
                  type="text"
                  value={tenantForm.identity_number}
                  onChange={handleTenantFormChange}
                  maxLength={12}
                />
              </label>

              <label>
                Số điện thoại *
                <input
                  name="phone"
                  type="text"
                  value={tenantForm.phone}
                  onChange={handleTenantFormChange}
                  maxLength={10}
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="text"
                  value={tenantForm.email}
                  onChange={handleTenantFormChange}
                />
              </label>

              <label>
                Giới tính
                <select
                  name="gender"
                  value={tenantForm.gender}
                  onChange={handleTenantFormChange}
                >
                  <option value="">Chưa chọn</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </label>

              <label>
                Địa chỉ *
                <input
                  name="address"
                  type="text"
                  value={tenantForm.address}
                  onChange={handleTenantFormChange}
                  maxLength={255}
                />
              </label>

              <label>
                Thông tin liên hệ thêm
                <textarea
                  name="contact_info"
                  value={tenantForm.contact_info}
                  onChange={handleTenantFormChange}
                  maxLength={255}
                  rows={3}
                />
              </label>

              {formError && <p className="tenant-form-error">{formError}</p>}

              <div className="tenant-form-actions">
                <button
                  type="button"
                  onClick={() => setShowTenantForm(false)}
                  disabled={savingTenant}
                >
                  Hủy
                </button>

                <button type="submit" disabled={savingTenant}>
                  {savingTenant
                    ? "Đang lưu..."
                    : editingTenant
                      ? "Lưu thay đổi"
                      : "Thêm người thuê"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL XÁC NHẬN XÓA */}
      {tenantToDelete && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <h3>Xóa hồ sơ {tenantToDelete.full_name}?</h3>
            <p>Hành động này không thể hoàn tác.</p>
            {actionError && (
              <p style={{ color: "#ef4444", marginTop: "8px" }}>
                {actionError}
              </p>
            )}
            <div className="modal-buttons" style={{ marginTop: "16px" }}>
              <button
                className="btn-cancel"
                onClick={() => setTenantToDelete(null)}
                disabled={deletingId !== null}
              >
                Hủy
              </button>
              <button
                className="btn-confirm"
                onClick={handleDeleteTenant}
                disabled={deletingId !== null}
              >
                {deletingId !== null ? "Đang xóa..." : "Xóa hồ sơ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tenants;
