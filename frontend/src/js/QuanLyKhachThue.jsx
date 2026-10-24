import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isOwner } from "../PhanQuyen";
import "../css/TongQuan.css";
import "../css/QuanLyPhong.css";

function Tenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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
    <div className="dashboard-layout">
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
      <main className="main-content">
        <header className="main-header">
          <div>
            <h1>Quản lý người thuê</h1>
            <p>Danh sách và thông tin chi tiết khách thuê trọ</p>
          </div>
        </header>

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

            <button
              className="btn-add-room"
              onClick={() => navigate("/tenants/add")}
            >
              + Thêm người thuê
            </button>
          </div>

          {/* Bảng dữ liệu người thuê */}
          <div className="room-table-card">
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
                            <strong>{item.full_name}</strong>
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
                              className="btn-action-edit"
                              title="Sửa thông tin"
                              onClick={() =>
                                navigate(`/tenants/edit/${item.tenant_id}`)
                              }
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              className="btn-action-delete"
                              title="Xóa người thuê"
                              onClick={() => setTenantToDelete(item)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="m19 6-1 14H6L5 6" />
                                <path d="M10 11v5M14 11v5" />
                              </svg>
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
