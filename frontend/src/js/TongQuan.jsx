import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogoutConfirmation } from "./XacNhanDangXuat";
import { isOwner } from "../PhanQuyen";
import "../css/TongQuan.css"; 

function Dashboard() {
  const navigate = useNavigate();
  const requestLogout = useLogoutConfirmation();

  const [showRooms, setShowRooms] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("token");

    try {
      const response = await fetch("http://localhost:3000/api/rooms", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Không thể tải danh sách phòng.");
        return;
      }

      setRooms(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách phòng:", err);
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleShowRooms = () => {
    setShowRooms(true);
    loadRooms();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const getRoomStatus = (status) => {
    const statuses = {
      AVAILABLE: "Còn trống",
      HOLD: "Đang giữ phòng",
      OCCUPIED: "Đang có người thuê",
      PROCESSING: "Đang xử lý",
      MAINTENANCE: "Đang bảo trì",
    };
    return statuses[status] || status || "Chưa xác định";
  };

  const totalRooms = rooms.length;
  const countByStatus = (status) =>
    rooms.filter((room) => room.status === status).length;
  const occupiedRooms = countByStatus("OCCUPIED");
  const availableRooms = countByStatus("AVAILABLE");
  const processingRooms = countByStatus("PROCESSING");
  const maintenanceRooms = countByStatus("MAINTENANCE");
  const roomPercentage = (count) =>
    totalRooms ? Math.round((count / totalRooms) * 100) : 0;
  const totalRoomsDisplay =
    loading && totalRooms === 0
      ? "…"
      : error && totalRooms === 0
        ? "—"
        : totalRooms;

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
          <li className="menu-item active">
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
          {isOwner() && <li className="menu-item" onClick={() => navigate("/employees")}><span>🧑‍💼</span> Quản lý tài khoản</li>}
          <li className="menu-item">
            <span>⚙️</span> Cài đặt
          </li>
          
          {/* NÚT ĐĂNG XUẤT */}
          <li className="menu-item logout-btn" onClick={requestLogout}>
            <span className="logout-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H19a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-5"></path>
                <polyline points="7 16 3 12 7 8"></polyline>
                <line x1="3" y1="12" x2="15" y2="12"></line>
              </svg>
            </span>
            Đăng xuất
          </li>
        </ul>

        <div className="sidebar-footer">
          <p>Uy tín - Tiện lợi - Hiệu quả</p>
        </div>
      </aside>

      {/* NỘI DUNG CHÍNH BÊN PHẢI */}
      <main className="main-content">
        <header className="main-header">
          <div>
            <h1>Tổng quan</h1>
            <p>Theo dõi hoạt động nhà trọ của bạn</p>
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

        {/* HÀNG 1: 4 THẺ THỐNG KÊ */}
        <div className="stats-grid">
          <div className="stat-card yellow" onClick={handleShowRooms} style={{ cursor: "pointer" }}>
            <div className="stat-icon">🏠</div>
            <h3>Tổng số phòng</h3>
            <div className="stat-number">{totalRoomsDisplay}</div>
            <span className="stat-desc">Đồng bộ với danh sách phòng</span>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">👥</div>
            <h3>Đang thuê</h3>
            <div className="stat-number">{occupiedRooms}</div>
            <span className="stat-desc">🟢 {roomPercentage(occupiedRooms)}% tổng số phòng</span>
          </div>

          <div className="stat-card blue">
            <div className="stat-icon">🚪</div>
            <h3>Phòng trống</h3>
            <div className="stat-number">{availableRooms}</div>
            <span className="stat-desc">🔵 {roomPercentage(availableRooms)}% tổng số phòng</span>
          </div>

          <div className="stat-card red">
            <div className="stat-icon">⏳</div>
            <h3>Chờ xử lý</h3>
            <div className="stat-number">{processingRooms}</div>
            <span className="stat-desc">🔴 Cần kiểm tra</span>
          </div>
        </div>

        {/* HÀNG 2: TÌNH TRẠNG PHÒNG & THU TIỀN */}
        <div className="charts-grid">
          <div className="card-box">
            <h3 className="section-title">🏠 Tình trạng phòng</h3>
            <div className="room-status-content">
              <div className="donut-chart-mock">
                <div className="donut-inner">
                  <strong>{totalRoomsDisplay}</strong>
                  <span>phòng</span>
                </div>
              </div>
              <div className="status-legend">
                <div className="legend-item">
                  <span className="dot yellow"></span> Đang thuê: {occupiedRooms} phòng ({roomPercentage(occupiedRooms)}%)
                </div>
                <div className="legend-item">
                  <span className="dot blue"></span> Phòng trống: {availableRooms} phòng ({roomPercentage(availableRooms)}%)
                </div>
                <div className="legend-item">
                  <span className="dot red"></span> Bảo trì / sửa chữa: {maintenanceRooms} phòng ({roomPercentage(maintenanceRooms)}%)
                </div>
              </div>
            </div>
          </div>

          <div className="card-box">
            <div className="card-header-flex">
              <h3 className="section-title">💰 Thu tiền tháng 10</h3>
              <span className="sub-link">Tổng thu</span>
            </div>
            <div className="revenue-amount">Tổng thu: 36.500.000đ</div>
            <div className="revenue-growth">🟢 +12% so với tháng 9</div>
            <div className="bar-chart">
              <div className="bar-item">
                <div className="bar" style={{ height: "40%" }}></div>
                <span>Tuần 1:</span>
                <small>8.200.000đ</small>
              </div>
              <div className="bar-item">
                <div className="bar" style={{ height: "60%" }}></div>
                <span>Tuần 2:</span>
                <small>9.600.000đ</small>
              </div>
              <div className="bar-item">
                <div className="bar" style={{ height: "80%" }}></div>
                <span>Tuần 3:</span>
                <small>10.800.000đ</small>
              </div>
              <div className="bar-item">
                <div className="bar" style={{ height: "50%" }}></div>
                <span>Tuần 4:</span>
                <small>7.900.000đ</small>
              </div>
            </div>
          </div>
        </div>

        {/* DANH SÁCH BẢNG PHÒNG TRỌ */}
        {showRooms && (
          <section className="room-table-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", color: "#fff", fontSize: "1.2rem" }}>Danh sách phòng trọ hệ thống</h2>
                <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.85rem" }}>Lấy trực tiếp từ cơ sở dữ liệu.</p>
              </div>
              <button onClick={handleShowRooms} disabled={loading} className="reload-btn">
                {loading ? "Đang tải..." : "Tải lại"}
              </button>
            </div>

            {loading && <p style={{ color: "#fff" }}>Đang tải danh sách phòng...</p>}
            {error && <div style={{ padding: "12px", color: "#b91c1c", backgroundColor: "#fee2e2", borderRadius: "6px" }}>{error}</div>}

            {!loading && !error && (
              <div style={{ overflowX: "auto" }}>
                <table className="rooms-table">
                  <thead>
                    <tr>
                      {["Mã phòng", "Số phòng", "Loại phòng", "Diện tích", "Giá thuê/tháng", "Trạng thái"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room.room_id}>
                        <td>{room.room_code}</td>
                        <td>{room.room_number}</td>
                        <td>{room.type_name || "Chưa phân loại"}</td>
                        <td>{room.area_m2 ? `${room.area_m2} m²` : "N/A"}</td>
                        <td>{formatCurrency(room.listed_rent)}</td>
                        <td style={{ color: "#38bdf8" }}>{getRoomStatus(room.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

    </div>
  );
}

export default Dashboard;
