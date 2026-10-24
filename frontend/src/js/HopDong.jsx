import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogoutConfirmation } from "./XacNhanDangXuat";
import { isOwner } from "../PhanQuyen";
import { FiAlertCircle, FiCheckCircle, FiEdit2, FiFileText, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import "../css/TongQuan.css";
import "../css/HopDong.css";

const API_URL = "http://localhost:3000/api/contracts";
function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const EMPTY_FORM = {
  contract_code: "",
  room_id: "",
  tenant_id: "",
  start_date: localToday(),
  end_date: "",
  monthly_rent: "",
  deposit_amount: "0",
  status: "ACTIVE",
  notes: "",
};

function getToken() { return localStorage.getItem("token"); }
function currency(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
function shortDate(value) {
  if (!value) return "Không thời hạn";
  const date = String(value).slice(0, 10).split("-");
  return date.length === 3 ? `${date[2]}/${date[1]}/${date[0]}` : value;
}

function Contracts() {
  const navigate = useNavigate();
  const requestLogout = useLogoutConfirmation();
  const [contracts, setContracts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      if (!getToken()) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const [contractsResponse, optionsResponse] = await Promise.all([
        fetch(API_URL, { headers }),
        fetch(`${API_URL}/options`, { headers }),
      ]);
      const [contractsResult, optionsResult] = await Promise.all([contractsResponse.json(), optionsResponse.json()]);
      if (!contractsResponse.ok) throw new Error(contractsResult.message || "Không thể tải hợp đồng.");
      if (!optionsResponse.ok) throw new Error(optionsResult.message || "Không thể tải danh sách phòng và khách thuê.");
      setContracts(Array.isArray(contractsResult.data) ? contractsResult.data : []);
      setRooms(optionsResult.data?.rooms || []);
      setTenants(optionsResult.data?.tenants || []);
    } catch (loadError) {
      setError(loadError.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredContracts = useMemo(() => contracts.filter((contract) => {
    const searchText = `${contract.contract_code} ${contract.room_code} ${contract.tenant_name}`.toLocaleLowerCase("vi");
    return searchText.includes(keyword.trim().toLocaleLowerCase("vi")) && (statusFilter === "ALL" || contract.status === statusFilter);
  }), [contracts, keyword, statusFilter]);
  const activeCount = contracts.filter((contract) => contract.status === "ACTIVE").length;
  const endedCount = contracts.filter((contract) => contract.status === "ENDED").length;
  const cancelledCount = contracts.filter((contract) => contract.status === "CANCELLED").length;

  function openCreate() {
    setEditing(null);
    setNotice("");
    setError("");
    setForm({ ...EMPTY_FORM, contract_code: `HD-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` });
  }
  function openEdit(contract) {
    setEditing(contract.contract_id);
    setNotice("");
    setError("");
    setForm({
      contract_code: contract.contract_code || "",
      room_id: String(contract.room_id),
      tenant_id: String(contract.tenant_id),
      start_date: String(contract.start_date).slice(0, 10),
      end_date: contract.end_date ? String(contract.end_date).slice(0, 10) : "",
      monthly_rent: String(contract.monthly_rent ?? ""),
      deposit_amount: String(contract.deposit_amount ?? 0),
      status: contract.status || "ACTIVE",
      notes: contract.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeForm() { setEditing(null); setForm(EMPTY_FORM); setError(""); }
  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => {
      const next = { ...previous, [name]: value };
      if (name === "room_id" && !editing) {
        const selectedRoom = rooms.find((room) => String(room.room_id) === value);
        if (selectedRoom?.listed_rent != null) next.monthly_rent = String(selectedRoom.listed_rent);
      }
      return next;
    });
  }

  async function saveContract(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(editing ? `${API_URL}/${editing}` : API_URL, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể lưu hợp đồng.");
      setNotice(result.message || "Đã lưu hợp đồng.");
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContract() {
    if (!deleting) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/${deleting.contract_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể xóa hợp đồng.");
      setDeleting(null);
      setNotice(result.message || "Đã xóa hợp đồng.");
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message || "Không thể kết nối đến máy chủ.");
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="dashboard-layout contracts-dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo"><div className="logo-icon">🏠</div><div><h2>NHÀ TRỌ SÁU BÁ</h2></div></div>
        <ul className="sidebar-menu">
          <li className="menu-item" onClick={() => navigate(isOwner() ? "/dashboard" : "/employee")}><span>🏠</span> Tổng quan</li>
          <li className="menu-item" onClick={() => navigate("/rooms")}><span>🚪</span> Quản lý phòng</li>
          <li className="menu-item" onClick={() => navigate("/tenants")}><span>👥</span> Quản lý người thuê</li>
          <li className="menu-item active"><span>📄</span> Quản lý hợp đồng</li>
          <li className="menu-item" onClick={() => navigate("/payments")}><span>💰</span> Quản lý thu tiền</li>
          <li className="menu-item" onClick={() => navigate("/services")}><span>🛠️</span> Dịch vụ</li>
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

      <main className="main-content contracts-main">
        <header className="main-header">
          <div><h1>Quản lý hợp đồng</h1><p>Theo dõi thời hạn, khách thuê và tiền thuê phòng</p></div>
          <div className="header-right"><div className="user-profile"><span>👤 Quản trị viên</span></div></div>
        </header>

        <div className="contracts-stats">
          <article className="contracts-stat"><span>Tổng hợp đồng</span><strong>{contracts.length}</strong></article>
          <article className="contracts-stat active-stat"><span>Đang hiệu lực</span><strong>{activeCount}</strong></article>
          <article className="contracts-stat ended-stat"><span>Đã kết thúc</span><strong>{endedCount}</strong></article>
          <article className="contracts-stat cancelled-stat"><span>Đã hủy</span><strong>{cancelledCount}</strong></article>
        </div>

        <section className="contracts-panel">
          <div className="contracts-toolbar">
            <div className="contracts-search"><FiSearch /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm mã hợp đồng, phòng hoặc người thuê..." /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái hợp đồng">
              <option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Đang hiệu lực</option><option value="ENDED">Đã kết thúc</option><option value="CANCELLED">Đã hủy</option>
            </select>
            <button className="contracts-refresh" type="button" onClick={loadData} disabled={loading} title="Tải lại"><FiRefreshCw /></button>
            <button className="contracts-add-button" type="button" onClick={openCreate}><FiPlus /> Tạo hợp đồng</button>
          </div>

          {notice && <div className="contracts-notice"><FiCheckCircle />{notice}<button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo"><FiX /></button></div>}
          {error && <div className="contracts-error" role="alert"><FiAlertCircle />{error}<button type="button" onClick={() => setError("")} aria-label="Đóng lỗi"><FiX /></button></div>}

          {(editing !== null || form.contract_code) && (
            <form className="contract-form" onSubmit={saveContract}>
              <div className="contract-form-heading"><div><span className="contract-form-icon"><FiFileText /></span><div><h2>{editing ? "Chỉnh sửa hợp đồng" : "Tạo hợp đồng mới"}</h2><p>Liên kết hợp đồng với phòng và hồ sơ khách thuê.</p></div></div><button type="button" className="contract-close" onClick={closeForm} aria-label="Đóng biểu mẫu"><FiX /></button></div>
              <div className="contract-form-grid">
                <label>Mã hợp đồng *<input name="contract_code" value={form.contract_code} onChange={updateForm} required maxLength={40} placeholder="VD: HD-2026-001" /></label>
                <label>Phòng thuê *<select name="room_id" value={form.room_id} onChange={updateForm} required><option value="">Chọn phòng</option>{rooms.map((room) => <option key={room.room_id} value={room.room_id}>{room.room_code || room.room_number} · {currency(room.listed_rent)}</option>)}</select></label>
                <label>Khách thuê *<select name="tenant_id" value={form.tenant_id} onChange={updateForm} required><option value="">Chọn khách thuê</option>{tenants.map((tenant) => <option key={tenant.tenant_id} value={tenant.tenant_id}>{tenant.full_name} · {tenant.phone}</option>)}</select></label>
                <label>Ngày bắt đầu *<input type="date" name="start_date" value={form.start_date} onChange={updateForm} required /></label>
                <label>Ngày kết thúc<input type="date" name="end_date" value={form.end_date} onChange={updateForm} min={form.start_date} /></label>
                <label>Tiền thuê mỗi tháng (VNĐ) *<input type="number" name="monthly_rent" value={form.monthly_rent} onChange={updateForm} min="0" step="1000" required /></label>
                <label>Tiền đặt cọc (VNĐ)<input type="number" name="deposit_amount" value={form.deposit_amount} onChange={updateForm} min="0" step="1000" /></label>
                <label>Trạng thái<select name="status" value={form.status} onChange={updateForm}><option value="ACTIVE">Đang hiệu lực</option><option value="ENDED">Đã kết thúc</option><option value="CANCELLED">Đã hủy</option></select></label>
                <label className="contract-notes-field">Ghi chú<textarea name="notes" value={form.notes} onChange={updateForm} rows="3" maxLength={5000} placeholder="Điều khoản hoặc ghi chú thêm..." /></label>
              </div>
              <div className="contract-form-actions"><button type="button" className="contract-cancel-button" onClick={closeForm}>Hủy</button><button type="submit" className="contracts-add-button" disabled={saving}>{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo hợp đồng"}</button></div>
            </form>
          )}

          <div className="contracts-table-heading"><h2>Danh sách hợp đồng</h2><span>{loading ? "Đang tải..." : `Hiển thị ${filteredContracts.length} hợp đồng`}</span></div>
          {loading ? <div className="contracts-empty">Đang tải danh sách hợp đồng...</div> : filteredContracts.length === 0 ? (
            <div className="contracts-empty"><span className="contracts-empty-icon"><FiFileText /></span><strong>{contracts.length ? "Không tìm thấy hợp đồng phù hợp" : "Chưa có hợp đồng nào"}</strong><span>{contracts.length ? "Thử đổi từ khóa hoặc bộ lọc." : "Tạo hợp đồng để gắn phòng với khách thuê."}</span>{!contracts.length && <button className="contracts-add-button" type="button" onClick={openCreate}><FiPlus /> Tạo hợp đồng đầu tiên</button>}</div>
          ) : (
            <div className="contracts-table-wrap"><table className="contracts-table"><thead><tr><th>MÃ HỢP ĐỒNG</th><th>PHÒNG</th><th>KHÁCH THUÊ</th><th>THỜI HẠN</th><th>TIỀN THUÊ</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
              {filteredContracts.map((contract) => <tr key={contract.contract_id}>
                <td><strong className="contract-code"><FiFileText />{contract.contract_code}</strong></td>
                <td><strong>{contract.room_code || contract.room_number}</strong></td>
                <td><div className="contract-tenant-name">{contract.tenant_name}<small>{contract.tenant_phone}</small></div></td>
                <td>{shortDate(contract.start_date)}<small className="contract-date-end">đến {shortDate(contract.end_date)}</small></td>
                <td><strong>{currency(contract.monthly_rent)}</strong><small className="contract-deposit">Cọc: {currency(contract.deposit_amount)}</small></td>
                <td><span className={`contract-status status-${String(contract.status).toLowerCase()}`}>{contract.status === "ACTIVE" ? "Đang hiệu lực" : contract.status === "ENDED" ? "Đã kết thúc" : "Đã hủy"}</span></td>
                <td><div className="contract-row-actions"><button type="button" onClick={() => openEdit(contract)} title="Sửa hợp đồng"><FiEdit2 /></button><button type="button" className="delete-contract-button" onClick={() => setDeleting(contract)} title="Xóa hợp đồng"><FiTrash2 /></button></div></td>
              </tr>)}
            </tbody></table></div>
          )}
        </section>
      </main>

      {deleting && <div className="contract-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleting(null); }}><section className="contract-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-contract-title"><span className="contract-delete-icon"><FiTrash2 /></span><h2 id="delete-contract-title">Xóa hợp đồng?</h2><p>Bạn có chắc muốn xóa hợp đồng <strong>{deleting.contract_code}</strong> không? Thao tác này không thể hoàn tác.</p><div><button className="contract-cancel-button" type="button" onClick={() => setDeleting(null)} disabled={saving}>Giữ lại</button><button className="contract-confirm-delete" type="button" onClick={deleteContract} disabled={saving}>{saving ? "Đang xóa..." : "Xóa hợp đồng"}</button></div></section></div>}
    </div>
  );
}

export default Contracts;
