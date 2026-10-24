import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogoutConfirmation } from "./XacNhanDangXuat";
import { isOwner } from "../PhanQuyen";
import { FiAlertCircle, FiCheckCircle, FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiTool, FiTrash2, FiX } from "react-icons/fi";
import "../css/TongQuan.css";
import "../css/DichVu.css";

const API_URL = "http://localhost:3000/api/services";
const categories = ["Điện", "Nước", "Thiết bị", "Cửa và khóa", "Vệ sinh", "Khác"];
const statusNames = { OPEN: "Chờ xử lý", IN_PROGRESS: "Đang sửa", COMPLETED: "Đã hoàn tất", CANCELLED: "Đã hủy" };
const priorityNames = { LOW: "Thấp", NORMAL: "Bình thường", HIGH: "Khẩn cấp" };
const getToday = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };
const freshForm = () => ({ room_id: "", category: "Điện", title: "", description: "", priority: "NORMAL", status: "OPEN", reported_date: getToday(), cost: "0", resolution_notes: "" });
const token = () => localStorage.getItem("token");
const currency = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value) || 0);
const dateLabel = (value) => { const parts = String(value || "").slice(0, 10).split("-"); return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "—"; };

function Services() {
  const navigate = useNavigate();
  const requestLogout = useLogoutConfirmation();
  const [items, setItems] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (!token()) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const headers = { Authorization: `Bearer ${token()}` };
      const [itemsResponse, roomsResponse] = await Promise.all([fetch(API_URL, { headers }), fetch(`${API_URL}/options`, { headers })]);
      const [itemsResult, roomsResult] = await Promise.all([itemsResponse.json(), roomsResponse.json()]);
      if (!itemsResponse.ok) throw new Error(itemsResult.message || "Không tải được danh sách sửa chữa.");
      if (!roomsResponse.ok) throw new Error(roomsResult.message || "Không tải được danh sách phòng.");
      setItems(Array.isArray(itemsResult.data) ? itemsResult.data : []);
      setRooms(Array.isArray(roomsResult.data) ? roomsResult.data : []);
    } catch (loadError) { setError(loadError.message || "Không kết nối được máy chủ."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const visibleItems = useMemo(() => items.filter((item) => {
    const text = `${item.room_code} ${item.title} ${item.category} ${item.description || ""}`.toLocaleLowerCase("vi");
    return text.includes(keyword.trim().toLocaleLowerCase("vi")) && (statusFilter === "ALL" || item.status === statusFilter);
  }), [items, keyword, statusFilter]);
  const openCount = items.filter((item) => item.status === "OPEN").length;
  const workingCount = items.filter((item) => item.status === "IN_PROGRESS").length;
  const completedCount = items.filter((item) => item.status === "COMPLETED").length;
  const totalCost = items.reduce((total, item) => total + Number(item.cost || 0), 0);

  function openCreate() {
    if (!rooms.length) { setError("Chưa có phòng trong hệ thống. Hãy thêm phòng trước khi ghi nhận sửa chữa."); return; }
    setError(""); setSuccess(""); setEditingId(null); setForm({ ...freshForm(), room_id: String(rooms[0].room_id) });
  }
  function openEdit(item) {
    setError(""); setSuccess(""); setEditingId(item.service_id);
    setForm({ room_id: String(item.room_id), category: item.category, title: item.title, description: item.description || "", priority: item.priority, status: item.status, reported_date: String(item.reported_date).slice(0, 10), cost: String(item.cost || 0), resolution_notes: item.resolution_notes || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeForm() { setForm(null); setEditingId(null); }
  function handleChange(event) { const { name, value } = event.target; setForm((previous) => ({ ...previous, [name]: value })); }

  async function saveService(event) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không lưu được yêu cầu sửa chữa.");
      setSuccess(result.message || "Đã lưu yêu cầu sửa chữa."); setForm(null); setEditingId(null); await loadData();
    } catch (saveError) { setError(saveError.message || "Không kết nối được máy chủ."); }
    finally { setSaving(false); }
  }
  async function deleteService() {
    if (!deleting) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_URL}/${deleting.service_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không xóa được yêu cầu.");
      setDeleting(null); setSuccess(result.message || "Đã xóa yêu cầu."); await loadData();
    } catch (deleteError) { setError(deleteError.message || "Không kết nối được máy chủ."); setDeleting(null); }
    finally { setSaving(false); }
  }

  return <div className="dashboard-layout services-dashboard">
    <aside className="sidebar">
      <div className="sidebar-logo"><div className="logo-icon">🏠</div><div><h2>NHÀ TRỌ SÁU BÁ</h2></div></div>
      <ul className="sidebar-menu">
        <li className="menu-item" onClick={() => navigate(isOwner() ? "/dashboard" : "/employee")}><span>🏠</span> Tổng quan</li>
        <li className="menu-item" onClick={() => navigate("/rooms")}><span>🚪</span> Quản lý phòng</li>
        <li className="menu-item" onClick={() => navigate("/tenants")}><span>👥</span> Quản lý người thuê</li>
        <li className="menu-item" onClick={() => navigate("/contracts")}><span>📄</span> Quản lý hợp đồng</li>
        <li className="menu-item" onClick={() => navigate("/payments")}><span>💰</span> Quản lý thu tiền</li>
        <li className="menu-item active"><span>🛠️</span> Dịch vụ</li>
        {isOwner() && <li className="menu-item" onClick={() => navigate("/employees")}><span>🧑‍💼</span> Quản lý tài khoản</li>}
        <li className="menu-item"><span>⚙️</span> Cài đặt</li>
        <li className="menu-item logout-btn" onClick={requestLogout}><span className="logout-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H19a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-5"></path>
              <polyline points="7 16 3 12 7 8"></polyline>
              <line x1="3" y1="12" x2="15" y2="12"></line>
            </svg>
          </span> Đăng xuất</li>
      </ul>
      <div className="sidebar-footer"><p>Uy tín - Tiện lợi - Hiệu quả</p></div>
    </aside>
    <main className="main-content services-main">
      <header className="main-header"><div><h1>Dịch vụ sửa chữa</h1><p>Ghi nhận sự cố và theo dõi việc khắc phục trong từng phòng</p></div><div className="header-right"><div className="user-profile"><span>👤 Quản trị viên</span></div></div></header>
      <section className="services-stats">
        <article className="service-stat"><span>Tổng yêu cầu</span><strong>{items.length}</strong></article>
        <article className="service-stat service-open-stat"><span>Chờ xử lý</span><strong>{openCount}</strong></article>
        <article className="service-stat service-working-stat"><span>Đang sửa</span><strong>{workingCount}</strong></article>
        <article className="service-stat service-done-stat"><span>Đã hoàn tất</span><strong>{completedCount}</strong></article>
      </section>
      <section className="services-panel">
        <div className="services-toolbar"><div className="services-search"><FiSearch /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo phòng, sự cố hoặc nhóm dịch vụ..." /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái"><option value="ALL">Tất cả trạng thái</option>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" className="service-refresh" onClick={loadData} disabled={loading} aria-label="Tải lại"><FiRefreshCw /></button><button type="button" className="service-primary-button" onClick={openCreate}><FiPlus /> Ghi nhận sự cố</button></div>
        {success && <div className="services-notice"><FiCheckCircle />{success}<button type="button" onClick={() => setSuccess("")} aria-label="Đóng"><FiX /></button></div>}
        {error && <div className="services-error" role="alert"><FiAlertCircle />{error}<button type="button" onClick={() => setError("")} aria-label="Đóng"><FiX /></button></div>}
        {form && <form className="service-form" onSubmit={saveService}>
          <div className="service-form-title"><div><span><FiTool /></span><div><h2>{editingId ? "Cập nhật sửa chữa" : "Ghi nhận sự cố mới"}</h2><p>Chọn phòng và mô tả vấn đề cần khắc phục.</p></div></div><button type="button" onClick={closeForm} aria-label="Đóng biểu mẫu"><FiX /></button></div>
          <div className="service-form-grid">
            <label>Phòng *<select name="room_id" value={form.room_id} onChange={handleChange} required>{rooms.map((room) => <option key={room.room_id} value={room.room_id}>{room.room_code}</option>)}</select></label>
            <label>Nhóm vấn đề *<select name="category" value={form.category} onChange={handleChange}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="service-wide-field">Tên sự cố *<input name="title" maxLength="160" value={form.title} onChange={handleChange} placeholder="Ví dụ: Vòi nước bị rò rỉ" required /></label>
            <label>Mức độ ưu tiên<select name="priority" value={form.priority} onChange={handleChange}><option value="LOW">Thấp</option><option value="NORMAL">Bình thường</option><option value="HIGH">Khẩn cấp</option></select></label>
            <label>Trạng thái<select name="status" value={form.status} onChange={handleChange}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Ngày ghi nhận *<input name="reported_date" type="date" value={form.reported_date} onChange={handleChange} required /></label>
            <label>Chi phí sửa chữa (VNĐ)<input name="cost" type="number" min="0" step="1000" value={form.cost} onChange={handleChange} /></label>
            <label className="service-wide-field">Mô tả tình trạng<textarea name="description" rows="3" maxLength="5000" value={form.description} onChange={handleChange} placeholder="Mô tả hiện trạng, vị trí hoặc thông tin cần lưu ý..." /></label>
            <label className="service-wide-field">Ghi chú xử lý<textarea name="resolution_notes" rows="2" maxLength="5000" value={form.resolution_notes} onChange={handleChange} placeholder="Ghi lại cách khắc phục hoặc người phụ trách..." /></label>
          </div>
          <div className="service-form-actions"><button type="button" className="service-cancel-button" onClick={closeForm}><FiX /> Hủy</button><button type="submit" className="service-primary-button" disabled={saving}>{saving ? <><FiRefreshCw className="service-spin" /> Đang lưu...</> : <><FiCheckCircle /> {editingId ? "Lưu thay đổi" : "Lưu yêu cầu"}</>}</button></div>
        </form>}
        <div className="services-list-heading"><h2>Yêu cầu sửa chữa</h2><span>{loading ? "Đang tải..." : `Hiển thị ${visibleItems.length} yêu cầu`}</span></div>
        {loading ? <div className="services-empty">Đang tải danh sách...</div> : visibleItems.length === 0 ? <div className="services-empty"><span className="services-empty-icon"><FiTool /></span><strong>{items.length ? "Không tìm thấy yêu cầu phù hợp" : "Chưa có yêu cầu sửa chữa"}</strong><span>{items.length ? "Thử đổi từ khóa hoặc bộ lọc." : "Ghi nhận sự cố đầu tiên để bắt đầu theo dõi."}</span></div> : <div className="services-table-wrap"><table className="services-table"><thead><tr><th>PHÒNG</th><th>VẤN ĐỀ</th><th>ƯU TIÊN</th><th>NGÀY GHI NHẬN</th><th>CHI PHÍ</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={item.service_id}>
          <td><strong>{item.room_code}</strong></td><td><strong>{item.title}</strong><small>{item.category}{item.description ? ` · ${item.description}` : ""}{item.resolution_notes ? ` · Xử lý: ${item.resolution_notes}` : ""}</small></td><td><span className={`service-priority priority-${String(item.priority).toLowerCase()}`}>{priorityNames[item.priority]}</span></td><td>{dateLabel(item.reported_date)}</td><td>{currency(item.cost)}</td><td><span className={`service-status status-${String(item.status).toLowerCase()}`}>{statusNames[item.status]}</span></td><td><div className="service-actions"><button type="button" title="Sửa yêu cầu" onClick={() => openEdit(item)}><FiEdit2 /></button><button type="button" className="service-delete" title="Xóa yêu cầu" onClick={() => setDeleting(item)}><FiTrash2 /></button></div></td>
        </tr>)}</tbody></table></div>}
      </section>
    </main>
    {deleting && <div className="service-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleting(null); }}><section className="service-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-service-title"><span>🗑️</span><h2 id="delete-service-title">Xóa yêu cầu sửa chữa?</h2><p>Xóa yêu cầu <strong>{deleting.room_code} · {deleting.title}</strong>? Thao tác này không thể hoàn tác.</p><div><button type="button" className="service-cancel-button" onClick={() => setDeleting(null)} disabled={saving}>Giữ lại</button><button type="button" className="service-confirm-delete" onClick={deleteService} disabled={saving}>{saving ? "Đang xóa..." : "Xóa yêu cầu"}</button></div></section></div>}
  </div>;
}

export default Services;
