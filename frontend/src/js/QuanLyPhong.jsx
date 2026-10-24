import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useLogoutConfirmation } from "./XacNhanDangXuat";
import { isOwner } from "../PhanQuyen";
import "../css/TongQuan.css";
import "../css/QuanLyPhong.css";
import GiuPhong from "./GiuPhong";

function Rooms() {
  const navigate = useNavigate();
  const requestLogout = useLogoutConfirmation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [updatingRoomId, setUpdatingRoomId] = useState(null);
  const [openStatusMenu, setOpenStatusMenu] = useState(null);
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [phongChonGiu, setPhongChonGiu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // Tự động gọi API lấy danh sách phòng khi vào trang
  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!openStatusMenu) return undefined;

    const closeMenu = (event) => {
      if (!event.target.closest(".room-status-control, .room-status-menu")) {
        setOpenStatusMenu(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenStatusMenu(null);
    };
    const closeOnScroll = () => setOpenStatusMenu(null);

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, [openStatusMenu]);

  const fetchRooms = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/api/rooms");
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Không thể tải danh sách phòng.");
        setLoading(false);
        return;
      }

      setRooms(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách phòng:", err);
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const roomStatuses = [
    { value: "AVAILABLE", label: "Trống" },
    { value: "OCCUPIED", label: "Đang thuê" },
    { value: "HOLD", label: "Đang giữ" },
    { value: "MAINTENANCE", label: "Tạm ngưng" },
    { value: "PROCESSING", label: "Chờ xử lý" },
  ];

  const handleStatusChange = async (room, status) => {
    if (status === room.status) return;

    setActionError("");
    setUpdatingRoomId(room.room_id);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/rooms/${room.room_id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Không thể cập nhật trạng thái phòng.",
        );
      }

      setRooms((previous) =>
        previous.map((item) =>
          item.room_id === room.room_id ? { ...item, status } : item,
        ),
      );
    } catch (err) {
      setActionError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setUpdatingRoomId(null);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;

    setActionError("");
    setDeletingRoomId(roomToDelete.room_id);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/rooms/${roomToDelete.room_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Không thể xóa phòng.");
      }

      setRooms((previous) =>
        previous.filter((room) => room.room_id !== roomToDelete.room_id),
      );
      setRoomToDelete(null);
    } catch (err) {
      setActionError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setDeletingRoomId(null);
    }
  };
  console.log("Từ khóa đang gõ:", searchTerm, "| Tổng số phòng:", rooms.length);
  const filteredRooms = rooms.filter((room) => {
    if (!searchTerm.trim()) return true;

    const kw = searchTerm.toLowerCase().trim();

    // Lấy đúng chuỗi hiển thị giống hệt trên bảng <td>
    const tenPhongHienThi = String(room.room_code || room.room_number || "").toLowerCase();
    const loaiPhong = String(room.type_name || "").toLowerCase();

    return tenPhongHienThi.includes(kw) || loaiPhong.includes(kw);
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

          {/* NÚT ĐĂNG XUẤT NẰM DƯỚI CÙNG */}
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
            <h1>Quản lý phòng</h1>
            <p>Danh sách và quản lý thông tin các phòng</p>
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

        <div className="room-management-container">
          {/* Các thẻ thống kê nhỏ phía trên */}
          <div className="room-mini-stats">
            <div className="mini-stat-card">
              <span>Tổng số phòng</span>
              <strong>{rooms.length}</strong>
            </div>
            <div className="mini-stat-card green-border">
              <span>Trống (Available)</span>
              <strong className="text-green">
                {rooms.filter((r) => r.status === "AVAILABLE").length}
              </strong>
            </div>
            <div className="mini-stat-card blue-border">
              <span>Đang thuê (Occupied)</span>
              <strong className="text-blue">
                {rooms.filter((r) => r.status === "OCCUPIED").length}
              </strong>
            </div>
            <div className="mini-stat-card yellow-border">
              <span>Đang giữ (Hold)</span>
              <strong className="text-yellow">
                {rooms.filter((r) => r.status === "HOLD").length}
              </strong>
            </div>
            <div className="mini-stat-card red-border">
              <span>Tạm ngưng (Maint.)</span>
              <strong className="text-red">
                {rooms.filter((r) => r.status === "MAINTENANCE").length}
              </strong>
            </div>
          </div>

          {/* Thanh công cụ tìm kiếm và nút thêm phòng */}
          <div className="room-toolbar">
            <div className="filter-group">
              <select className="filter-select">
                <option>Tất cả trạng thái</option>
              </select>
              <select className="filter-select">
                <option>Tất cả loại phòng</option>
              </select>
              <input
                type="text"
                placeholder="🔍 Tìm theo mã hoặc số phòng..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => {
                  console.log("Giá trị ô input đổi thành:", e.target.value);
                  setSearchTerm(e.target.value);
                }}
              />
            </div>

            <button
              className="btn-add-room"
              onClick={() => navigate("/rooms/add")}
            >
              + Thêm phòng
            </button>
          </div>

          {/* Bảng danh sách phòng */}
          <div className="room-table-card">
            <div className="table-header-title">Danh sách phòng</div>

            {loading && (
              <p style={{ padding: "20px", color: "#fff" }}>
                Đang tải danh sách phòng...
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
            {actionError && (
              <div className="room-action-error" role="alert">
                {actionError}
              </div>
            )}

            {!loading && !error && (
              <div style={{ overflowX: "auto" }}>
                <table className="rooms-table-modern">
                  <thead>
                    <tr>
                      <th>SỐ PHÒNG</th>
                      <th>LOẠI PHÒNG</th>
                      <th>DIỆN TÍCH (m²)</th>
                      <th>GIÁ THUÊ (VNĐ)</th>
                      <th>TRẠNG THÁI</th>
                      <th style={{ textAlign: "center" }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          style={{
                            textAlign: "center",
                            padding: "30px",
                            color: "#9ca3af",
                          }}
                        >
                          Chưa có dữ liệu phòng trong cơ sở dữ liệu.
                        </td>
                      </tr>
                    ) : (
                      filteredRooms.map((room) => (
                        <tr key={room.room_id}>
                          <td>
                            <div className="room-number-cell">
                              <span className="room-icon-sm">🚪</span>
                              <strong>
                                {room.room_code || room.room_number}
                              </strong>
                            </div>
                          </td>
                          <td>{room.type_name || "Phòng Tiêu chuẩn"}</td>
                          <td>{room.area_m2 ? `${room.area_m2}` : "20"}</td>
                          <td>
                            <strong>{formatCurrency(room.listed_rent)}</strong>
                          </td>
                          <td>
                            {(() => {
                              const currentStatus =
                                roomStatuses.find(
                                  (status) =>
                                    status.value ===
                                    (room.status || "AVAILABLE"),
                                ) || roomStatuses[0];
                              const statusClass = `room-status-${String(
                                currentStatus.value,
                              ).toLowerCase()}`;
                              const isOpen =
                                openStatusMenu?.roomId === room.room_id;

                              const toggleStatusMenu = (event) => {
                                if (isOpen) {
                                  setOpenStatusMenu(null);
                                  return;
                                }
                                const rect =
                                  event.currentTarget.getBoundingClientRect();
                                const menuHeight =
                                  roomStatuses.length * 42 + 12;
                                const top =
                                  rect.bottom + 8 + menuHeight <=
                                  window.innerHeight
                                    ? rect.bottom + 8
                                    : Math.max(8, rect.top - menuHeight - 8);
                                const width = Math.max(
                                  0,
                                  Math.min(
                                    window.innerWidth - 16,
                                    Math.max(rect.width, 180),
                                  ),
                                );
                                const left = Math.max(
                                  8,
                                  Math.min(
                                    rect.left,
                                    window.innerWidth - width - 8,
                                  ),
                                );
                                setOpenStatusMenu({
                                  roomId: room.room_id,
                                  top,
                                  left,
                                  width,
                                });
                              };

                              return (
                                <div className="room-status-control">
                                  <button
                                    type="button"
                                    className={`room-status-select ${statusClass}${
                                      isOpen ? " is-open" : ""
                                    }`}
                                    onClick={toggleStatusMenu}
                                    disabled={updatingRoomId === room.room_id}
                                    aria-label={`Trạng thái phòng ${
                                      room.room_code || room.room_number
                                    }`}
                                    aria-haspopup="listbox"
                                    aria-expanded={isOpen}
                                  >
                                    <span>
                                      {updatingRoomId === room.room_id
                                        ? "Đang lưu…"
                                        : currentStatus.label}
                                    </span>
                                    <span
                                      className="room-status-chevron"
                                      aria-hidden="true"
                                    />
                                  </button>
                                  {isOpen &&
                                    createPortal(
                                      <div
                                        className="room-status-menu"
                                        role="listbox"
                                        aria-label="Chọn trạng thái phòng"
                                        style={{
                                          top: openStatusMenu.top,
                                          left: openStatusMenu.left,
                                          width: openStatusMenu.width,
                                        }}
                                      >
                                        {roomStatuses.map((status) => (
                                          <button
                                            key={status.value}
                                            type="button"
                                            role="option"
                                            aria-selected={
                                              status.value ===
                                              currentStatus.value
                                            }
                                            className={`room-status-option room-status-option-${String(
                                              status.value,
                                            ).toLowerCase()}${
                                              status.value ===
                                              currentStatus.value
                                                ? " is-selected"
                                                : ""
                                            }`}
                                            onClick={() => {
                                              setOpenStatusMenu(null);
                                              handleStatusChange(
                                                room,
                                                status.value,
                                              );
                                            }}
                                          >
                                            <span
                                              className="room-status-dot"
                                              aria-hidden="true"
                                            />
                                            <span>{status.label}</span>
                                            {status.value ===
                                              currentStatus.value && (
                                              <span
                                                className="room-status-check"
                                                aria-hidden="true"
                                              >
                                                ✓
                                              </span>
                                            )}
                                          </button>
                                        ))}
                                      </div>,
                                      document.body,
                                    )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="room-row-actions">
                            {/* NÚT GIỮ PHÒNG (Chỉ hiện khi phòng AVAILABLE) */}
                            {room.status === "AVAILABLE" && (
                              <button
                                className="btn-action-hold"
                                title="Giữ phòng (120h)"
                                style={{
                                  backgroundColor: "#d97706",
                                  color: "#fff",
                                  border: "none",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  marginRight: "6px",
                                  fontSize: "0.85em",
                                }}
                                onClick={() => setPhongChonGiu(room)}
                              >
                                Giữ phòng
                              </button>
                            )}

                            <button
                              className="btn-action-edit"
                              title="Chỉnh sửa thông tin phòng"
                              aria-label={`Chỉnh sửa phòng ${
                                room.room_code || room.room_number
                              }`}
                              onClick={() =>
                                navigate(`/rooms/edit/${room.room_id}`)
                              }
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              className="btn-action-delete"
                              title={
                                room.status === "OCCUPIED"
                                  ? "Không thể xóa phòng đang thuê"
                                  : "Xóa phòng"
                              }
                              aria-label={`Xóa phòng ${
                                room.room_code || room.room_number
                              }`}
                              disabled={
                                room.status === "OCCUPIED" ||
                                deletingRoomId === room.room_id
                              }
                              onClick={() => setRoomToDelete(room)}
                            >
                              {deletingRoomId === room.room_id ? (
                                <span
                                  className="room-action-loading"
                                  aria-hidden="true"
                                >
                                  …
                                </span>
                              ) : (
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="m19 6-1 14H6L5 6" />
                                  <path d="M10 11v5M14 11v5" />
                                </svg>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Phân trang dưới cùng */}
            <div className="table-footer">
              <span>Hiển thị {filteredRooms.length} kết quả</span>
              <div className="pagination">
                <button className="page-btn active">1</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* POPUP GIỮ PHÒNG 120H */}
      {phongChonGiu && (
        <GiuPhong
          phong={phongChonGiu}
          onClose={() => setPhongChonGiu(null)}
          onSuccess={() => {
            setPhongChonGiu(null);
            fetchRooms(); // Load lại danh sách phòng sau khi cọc thành công
          }}
        />
      )}

      {/* HỘP THOẠI XÁC NHẬN XÓA PHÒNG */}
      {roomToDelete && (
        <div className="custom-modal-overlay">
          <div
            className="custom-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-room-title"
          >
            <h3 id="delete-room-title">
              Xóa phòng {roomToDelete.room_code || roomToDelete.room_number}?
            </h3>
            <p>
              Phòng sẽ bị xóa khỏi danh sách. Thao tác này không thể hoàn tác.
            </p>
            {actionError && (
              <p className="delete-room-error" role="alert">
                {actionError}
              </p>
            )}
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setRoomToDelete(null)}
                disabled={deletingRoomId !== null}
              >
                Hủy
              </button>
              <button
                className="btn-confirm"
                onClick={handleDeleteRoom}
                disabled={deletingRoomId !== null}
              >
                {deletingRoomId !== null ? "Đang xóa..." : "Xóa phòng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rooms;
