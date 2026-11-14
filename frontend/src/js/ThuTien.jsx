import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogoutConfirmation } from "./XacNhanDangXuat";
import { isOwner } from "../PhanQuyen";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import "../css/TongQuan.css";
import "../css/ThuTien.css";

const API_URL = "http://localhost:3000/api/payments";
const freshForm = () => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    contract_id: "",
    billing_month: month,
    electricity_previous_reading: "0",
    electricity_current_reading: "0",
    electricity_unit_price: "0",
    water_previous_reading: "0",
    water_current_reading: "0",
    water_unit_price: "0",
    other_amount: "0",
    rent_paid_amount: "0",
    electricity_paid_amount: "0",
    water_paid_amount: "0",
    other_paid_amount: "0",
    due_date: `${month}-10`,
    payment_method: "",
    notes: "",
    _nextDueDate: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-10`,
  };
};
const token = () => localStorage.getItem("token");
const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const moneyDigits = (value) => String(value ?? "").replace(/\D/g, "");
const formatMoneyInput = (value) => {
  const digits = moneyDigits(value);
  return digits
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(
        Number(digits),
      )
    : "";
};
const formatDate = (value) => {
  if (!value) return "—";
  const parts = String(value).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
};

function Payments() {
  const navigate = useNavigate();
  const requestLogout = useLogoutConfirmation();
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [partialPayment, setPartialPayment] = useState(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [partialError, setPartialError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const auth = { Authorization: `Bearer ${token()}` };
      if (!token())
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      const [paymentsResponse, contractsResponse] = await Promise.all([
        fetch(API_URL, { headers: auth }),
        fetch(`${API_URL}/options`, { headers: auth }),
      ]);
      const [paymentsResult, contractsResult] = await Promise.all([
        paymentsResponse.json(),
        contractsResponse.json(),
      ]);
      if (!paymentsResponse.ok)
        throw new Error(
          paymentsResult.message || "Không thể tải danh sách khoản thu.",
        );
      if (!contractsResponse.ok)
        throw new Error(contractsResult.message || "Không thể tải hợp đồng.");
      setPayments(
        Array.isArray(paymentsResult.data) ? paymentsResult.data : [],
      );
      setContracts(
        Array.isArray(contractsResult.data) ? contractsResult.data : [],
      );
    } catch (loadError) {
      setError(loadError.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const visiblePayments = useMemo(
    () =>
      payments.filter((payment) => {
        const text =
          `${payment.contract_code} ${payment.room_code} ${payment.tenant_name} ${String(payment.billing_month).slice(0, 7)}`.toLocaleLowerCase(
            "vi",
          );
        return (
          text.includes(keyword.trim().toLocaleLowerCase("vi")) &&
          (statusFilter === "ALL" || payment.status === statusFilter)
        );
      }),
    [payments, keyword, statusFilter],
  );
  const collectedTotal = payments.reduce(
    (sum, payment) => sum + Number(payment.paid_amount || 0),
    0,
  );
  const receivableTotal = payments.reduce(
    (sum, payment) => sum + Number(payment.remaining_amount || 0),
    0,
  );
  const unpaidCount = payments.filter(
    (payment) => payment.status !== "PAID",
  ).length;

  function openCreate() {
    if (!contracts.length) {
      setError(
        "Chưa có hợp đồng đang hiệu lực. Hãy tạo hợp đồng trước khi lập khoản thu.",
      );
      return;
    }
    setSuccess("");
    setError("");
    setEditingId(null);
    const next = freshForm();
    next.contract_id = String(contracts[0].contract_id);
    setForm(next);
  }
  function openEdit(payment) {
    setSuccess("");
    setError("");
    setEditingId(payment.payment_id);
    const billingMonth = String(payment.billing_month).slice(0, 7);
    setForm({
      contract_id: String(payment.contract_id),
      billing_month: billingMonth,
      electricity_previous_reading: String(
        payment.electricity_previous_reading || 0,
      ),
      electricity_current_reading: String(
        payment.electricity_current_reading || 0,
      ),
      electricity_unit_price: String(payment.electricity_unit_price || 0),
      water_previous_reading: String(payment.water_previous_reading || 0),
      water_current_reading: String(payment.water_current_reading || 0),
      water_unit_price: String(payment.water_unit_price || 0),
      other_amount: String(payment.other_amount || 0),
      rent_paid_amount: String(payment.rent_paid_amount || 0),
      electricity_paid_amount: String(payment.electricity_paid_amount || 0),
      water_paid_amount: String(payment.water_paid_amount || 0),
      other_paid_amount: String(payment.other_paid_amount || 0),
      due_date: String(payment.due_date).slice(0, 10),
      payment_method: payment.payment_method || "",
      notes: payment.notes || "",
      _nextDueDate: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeForm() {
    setForm(null);
    setEditingId(null);
    setError("");
  }
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => {
      if (name === "billing_month")
        return { ...previous, billing_month: value, due_date: `${value}-10` };
      return { ...previous, [name]: value };
    });
  }
  function handleMoneyChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: moneyDigits(value) }));
  }
  const selectedContract = contracts.find(
    (contract) => Number(contract.contract_id) === Number(form?.contract_id),
  );
  const electricityUsage = Math.max(
    Number(form?.electricity_current_reading || 0) -
      Number(form?.electricity_previous_reading || 0),
    0,
  );
  const waterUsage = Math.max(
    Number(form?.water_current_reading || 0) -
      Number(form?.water_previous_reading || 0),
    0,
  );
  const electricityAmount = Math.round(
    electricityUsage * Number(form?.electricity_unit_price || 0),
  );
  const waterAmount = Math.round(
    waterUsage * Number(form?.water_unit_price || 0),
  );
  const totalAmount =
    (Number(selectedContract?.monthly_rent) || 0) +
    electricityAmount +
    waterAmount +
    Number(form?.other_amount || 0);
  const totalPaid =
    Number(form?.rent_paid_amount || 0) +
    Number(form?.electricity_paid_amount || 0) +
    Number(form?.water_paid_amount || 0) +
    Number(form?.other_paid_amount || 0);
  const remainingAmount = Math.max(totalAmount - totalPaid, 0);

  async function savePayment(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const { _nextDueDate, ...payload } = form;
    payload.electricity_amount = electricityAmount;
    payload.water_amount = waterAmount;
    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Không thể lưu khoản thu.");
      setSuccess(result.message || "Đã lưu khoản thu.");
      setForm(null);
      setEditingId(null);
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  }
  async function deletePayment() {
    if (!deleting) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/${deleting.payment_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Không thể xóa khoản thu.");
      setDeleting(null);
      setSuccess(result.message || "Đã xóa khoản thu.");
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message || "Không thể kết nối đến máy chủ.");
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }
  async function updatePaymentStatus(payment, status) {
    if (status === "PARTIAL") {
      setError("");
      setSuccess("");
      setPartialError("");
      setPartialPayment(payment);
      setPartialAmount(
        payment.status === "PARTIAL" && Number(payment.paid_amount) > 0
          ? String(Number(payment.paid_amount))
          : "",
      );
      return;
    }
    setUpdatingStatus(payment.payment_id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_URL}/${payment.payment_id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message || "Không thể cập nhật trạng thái khoản thu.",
        );
      setSuccess(result.message || "Đã cập nhật trạng thái khoản thu.");
      await loadData();
    } catch (statusError) {
      setError(statusError.message || "Không kết nối được máy chủ.");
    } finally {
      setUpdatingStatus(null);
    }
  }
  async function savePartialPayment(event) {
    event.preventDefault();
    if (!partialPayment) return;
    if (
      !Number(partialAmount) ||
      Number(partialAmount) >= Number(partialPayment.total_amount)
    ) {
      setPartialError(
        "Số tiền đã nhận phải lớn hơn 0 và nhỏ hơn tổng phải thu.",
      );
      return;
    }
    setUpdatingStatus(partialPayment.payment_id);
    setError("");
    setPartialError("");
    setSuccess("");
    try {
      const response = await fetch(
        `${API_URL}/${partialPayment.payment_id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({
            status: "PARTIAL",
            paid_amount: Number(partialAmount),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Không thể cập nhật số tiền đã thu.");
      setPartialPayment(null);
      setPartialAmount("");
      setSuccess(result.message || "Đã cập nhật số tiền đã thu.");
      await loadData();
    } catch (statusError) {
      setPartialError(statusError.message || "Không kết nối được máy chủ.");
    } finally {
      setUpdatingStatus(null);
    }
  }

  return (
    <div className="dashboard-layout payments-dashboard">
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
          <li className="menu-item" onClick={() => navigate("/tenants")}>
            <span>👥</span> Quản lý người thuê
          </li>
          <li className="menu-item" onClick={() => navigate("/contracts")}>
            <span>📄</span> Quản lý hợp đồng
          </li>
          <li className="menu-item active">
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
      <main className="main-content payments-main">
        <header className="main-header">
          <div>
            <h1>Quản lý thu tiền</h1>
            <p>Theo dõi tiền thuê, điện nước và các khoản đã thu</p>
          </div>
          <div className="header-right">
            <div className="user-profile">
              <span>👤 Quản trị viên</span>
            </div>
          </div>
        </header>
        <section className="payments-stats">
          <article className="payment-stat">
            <span>Tổng khoản thu</span>
            <strong>{payments.length}</strong>
          </article>
          <article className="payment-stat collected-stat">
            <span>Đã thu</span>
            <strong>{formatCurrency(collectedTotal)}</strong>
          </article>
          <article className="payment-stat due-stat">
            <span>Còn phải thu</span>
            <strong>{formatCurrency(receivableTotal)}</strong>
          </article>
          <article className="payment-stat unpaid-stat">
            <span>Chưa thu đủ</span>
            <strong>{unpaidCount}</strong>
          </article>
        </section>
        <section className="payments-panel">
          <div className="payments-toolbar">
            <div className="payments-search">
              <FiSearch />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo hợp đồng, phòng, người thuê, tháng..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc tình trạng thu"
            >
              <option value="ALL">Tất cả tình trạng</option>
              <option value="PAID">Đã thu đủ</option>
              <option value="PARTIAL">Thu một phần</option>
              <option value="UNPAID">Chưa thu</option>
            </select>
            <button
              className="payments-refresh"
              type="button"
              onClick={loadData}
              disabled={loading}
              aria-label="Tải lại"
            >
              <FiRefreshCw />
            </button>
            <button
              className="payments-add-button"
              type="button"
              onClick={openCreate}
            >
              <FiPlus /> Ghi nhận khoản thu
            </button>
          </div>
          {success && (
            <div className="payments-notice">
              <FiCheckCircle />
              {success}
              <button
                type="button"
                onClick={() => setSuccess("")}
                aria-label="Đóng"
              >
                <FiX />
              </button>
            </div>
          )}
          {error && (
            <div className="payments-error" role="alert">
              <FiAlertCircle />
              {error}
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Đóng"
              >
                <FiX />
              </button>
            </div>
          )}
          {form && (
            <form className="payment-form" onSubmit={savePayment}>
              <div className="payment-form-title">
                <div>
                  <span className="payment-form-icon">💰</span>
                  <div>
                    <h2>
                      {editingId
                        ? "Cập nhật khoản thu"
                        : "Ghi nhận khoản thu mới"}
                    </h2>
                    <p>Mỗi hợp đồng có tối đa một khoản thu cho mỗi tháng.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="payment-close"
                  onClick={closeForm}
                  aria-label="Đóng biểu mẫu"
                >
                  <FiX />
                </button>
              </div>
              <div className="payment-form-grid">
                <label>
                  Hợp đồng *
                  <select
                    name="contract_id"
                    value={form.contract_id}
                    onChange={handleChange}
                    disabled={Boolean(editingId)}
                    required
                  >
                    <option value="">Chọn hợp đồng</option>
                    {contracts.map((contract) => (
                      <option
                        key={contract.contract_id}
                        value={contract.contract_id}
                      >
                        {contract.contract_code} · {contract.room_code} ·{" "}
                        {contract.tenant_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tháng thu *
                  <input
                    name="billing_month"
                    type="month"
                    value={form.billing_month}
                    onChange={handleChange}
                    disabled={Boolean(editingId)}
                    required
                  />
                </label>
                <div className="payment-utility-grid">
                  <section className="payment-utility-card">
                    <h3>⚡ Điện</h3>
                    <div className="payment-utility-fields">
                      <label>
                        Chỉ số cũ (kWh)
                        <input
                          name="electricity_previous_reading"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.electricity_previous_reading}
                          onChange={handleChange}
                        />
                      </label>
                      <label>
                        Chỉ số mới (kWh)
                        <input
                          name="electricity_current_reading"
                          type="number"
                          min={Number(form.electricity_previous_reading || 0)}
                          step="0.01"
                          value={form.electricity_current_reading}
                          onChange={handleChange}
                        />
                      </label>
                      <label>
                        Đơn giá (đ/kWh)
                        <input
                          name="electricity_unit_price"
                          type="text"
                          inputMode="numeric"
                          value={formatMoneyInput(form.electricity_unit_price)}
                          onChange={handleMoneyChange}
                        />
                      </label>
                    </div>
                    <div className="payment-utility-result">
                      <span>
                        Tiêu thụ:{" "}
                        <strong>
                          {electricityUsage.toLocaleString("vi-VN")} kWh
                        </strong>
                      </span>
                      <span>
                        Phải thu:{" "}
                        <strong>{formatCurrency(electricityAmount)}</strong>
                      </span>
                    </div>
                  </section>
                  <section className="payment-utility-card">
                    <h3>💧 Nước</h3>
                    <div className="payment-utility-fields">
                      <label>
                        Chỉ số cũ (m³)
                        <input
                          name="water_previous_reading"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.water_previous_reading}
                          onChange={handleChange}
                        />
                      </label>
                      <label>
                        Chỉ số mới (m³)
                        <input
                          name="water_current_reading"
                          type="number"
                          min={Number(form.water_previous_reading || 0)}
                          step="0.01"
                          value={form.water_current_reading}
                          onChange={handleChange}
                        />
                      </label>
                      <label>
                        Đơn giá (đ/m³)
                        <input
                          name="water_unit_price"
                          type="text"
                          inputMode="numeric"
                          value={formatMoneyInput(form.water_unit_price)}
                          onChange={handleMoneyChange}
                        />
                      </label>
                    </div>
                    <div className="payment-utility-result">
                      <span>
                        Tiêu thụ:{" "}
                        <strong>{waterUsage.toLocaleString("vi-VN")} m³</strong>
                      </span>
                      <span>
                        Phải thu: <strong>{formatCurrency(waterAmount)}</strong>
                      </span>
                    </div>
                  </section>
                </div>

                <label>
                  Khoản khác phải thu
                  <input
                    name="other_amount"
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInput(form.other_amount)}
                    onChange={handleMoneyChange}
                  />
                </label>

                <label>
                  Tổng phải thu
                  <input value={formatCurrency(totalAmount)} readOnly />
                </label>
                <label>
                  Ngày đến hạn *
                  <input
                    name="due_date"
                    type="date"
                    value={form.due_date}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label>
                  Hình thức thanh toán
                  <select
                    name="payment_method"
                    value={form.payment_method}
                    onChange={handleChange}
                  >
                    <option value="">Chưa ghi nhận</option>
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </label>
                <label className="payment-notes-field">
                  Ghi chú
                  <input
                    name="notes"
                    maxLength="1000"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Ghi chú thêm nếu có"
                  />
                </label>
              </div>
              <div className="payment-summary">
                <span>Đã thu {formatCurrency(totalPaid)} · Còn phải thu</span>
                <strong>{formatCurrency(remainingAmount)}</strong>
              </div>
              <div className="payment-form-actions">
                <button
                  className="payment-cancel"
                  type="button"
                  onClick={closeForm}
                >
                  <FiX /> Hủy
                </button>
                <button
                  className="payments-add-button payment-save-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <FiRefreshCw className="payment-spinning" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />{" "}
                      {editingId ? "Lưu thay đổi" : "Lưu khoản thu"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          <div className="payments-table-heading">
            <h2>Danh sách khoản thu</h2>
            <span>
              {loading
                ? "Đang tải..."
                : `Hiển thị ${visiblePayments.length} khoản thu`}
            </span>
          </div>
          {loading ? (
            <div className="payments-empty">Đang tải dữ liệu thu tiền...</div>
          ) : visiblePayments.length === 0 ? (
            <div className="payments-empty">
              <strong>
                {payments.length
                  ? "Không tìm thấy khoản thu phù hợp"
                  : "Chưa có khoản thu nào"}
              </strong>
              <span>
                {payments.length
                  ? "Thử đổi từ khóa hoặc bộ lọc."
                  : "Ghi nhận khoản thu đầu tiên từ hợp đồng đang hiệu lực."}
              </span>
            </div>
          ) : (
            <div className="payments-table-wrap">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>THÁNG</th>
                    <th>HỢP ĐỒNG / PHÒNG</th>
                    <th>KHÁCH THUÊ</th>
                    <th>TIỀN THUÊ</th>
                    <th>TIỀN ĐIỆN</th>
                    <th>TIỀN NƯỚC</th>
                    <th>KHÁC</th>
                    <th>CÒN LẠI</th>
                    <th>TÌNH TRẠNG</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePayments.map((payment) => (
                    <tr key={payment.payment_id}>
                      <td>
                        <strong>
                          {String(payment.billing_month).slice(0, 7)}
                        </strong>
                        <small>Hạn {formatDate(payment.due_date)}</small>
                      </td>
                      <td>
                        <strong>{payment.contract_code}</strong>
                        <small>{payment.room_code}</small>
                      </td>
                      <td>
                        <strong>{payment.tenant_name}</strong>
                        <small>{payment.tenant_phone}</small>
                      </td>
                      <td>
                        {formatCurrency(payment.rent_paid_amount)}
                        <small>/ {formatCurrency(payment.rent_amount)}</small>
                      </td>
                      <td>
                        {formatCurrency(payment.electricity_paid_amount)}
                        <small>
                          {Number(payment.electricity_current_reading) -
                            Number(payment.electricity_previous_reading)}{" "}
                          kWh · / {formatCurrency(payment.electricity_amount)}
                        </small>
                      </td>
                      <td>
                        {formatCurrency(payment.water_paid_amount)}
                        <small>
                          {Number(payment.water_current_reading) -
                            Number(payment.water_previous_reading)}{" "}
                          m³ · / {formatCurrency(payment.water_amount)}
                        </small>
                      </td>
                      <td>
                        {formatCurrency(payment.other_paid_amount)}
                        <small>/ {formatCurrency(payment.other_amount)}</small>
                      </td>
                      <td>
                        <strong>
                          {formatCurrency(payment.remaining_amount)}
                        </strong>
                        <small>
                          {payment.payment_method === "CASH"
                            ? "Tiền mặt"
                            : payment.payment_method === "BANK_TRANSFER"
                              ? "Chuyển khoản"
                              : payment.payment_method === "OTHER"
                                ? "Khác"
                                : "Chưa ghi nhận"}
                        </small>
                      </td>
                      <td>
                        <select
                          className={`payment-status-select payment-${String(payment.status).toLowerCase()}`}
                          aria-label={`Cập nhật tình trạng khoản thu ${payment.contract_code}`}
                          value={payment.status}
                          disabled={updatingStatus === payment.payment_id}
                          onChange={(event) =>
                            updatePaymentStatus(payment, event.target.value)
                          }
                        >
                          <option value="UNPAID">Chưa thu</option>
                          <option value="PARTIAL">Thu một phần</option>
                          <option value="PAID">Đã thu đủ</option>
                        </select>
                      </td>
                      <td>
                        <div className="payment-actions">
                          <button
                            type="button"
                            onClick={() => openEdit(payment)}
                            title="Sửa khoản thu"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="payment-delete"
                            onClick={() => setDeleting(payment)}
                            title="Xóa khoản thu"
                          >
                            <FiTrash2 />
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
      {partialPayment && (
        <div
          className="payment-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPartialPayment(null);
          }}
        >
          <form
            className="payment-partial-modal"
            onSubmit={savePartialPayment}
            role="dialog"
            aria-modal="true"
            aria-labelledby="partial-payment-title"
          >
            <div className="payment-partial-icon">💵</div>
            <h2 id="partial-payment-title">Cập nhật khoản thu một phần</h2>
            <div className="payment-partial-summary">
              <strong>
                {partialPayment.contract_code} <span>·</span>{" "}
                {partialPayment.room_code}
              </strong>
              <div>
                <span>Tổng phải thu</span>
                <b>{formatCurrency(partialPayment.total_amount)}</b>
              </div>
            </div>
            <label className="payment-partial-label">
              Số tiền đã nhận
              <div className="payment-partial-input-wrap">
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  value={formatMoneyInput(partialAmount)}
                  onChange={(event) => {
                    setPartialAmount(moneyDigits(event.target.value));
                    setPartialError("");
                  }}
                  placeholder="Nhập số tiền đã nhận"
                  required
                />
                <span>VNĐ</span>
              </div>
            </label>
            <small className="payment-partial-help">
              Số tiền cần nhỏ hơn tổng phải thu. Khoản đã nhận sẽ được tính lần
              lượt vào tiền thuê, điện, nước rồi khoản khác.
            </small>
            {partialError && (
              <div className="payment-partial-error" role="alert">
                {partialError}
              </div>
            )}
            <div className="payment-partial-actions">
              <button
                type="button"
                className="payment-cancel"
                onClick={() => setPartialPayment(null)}
                disabled={updatingStatus === partialPayment.payment_id}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="payments-add-button"
                disabled={updatingStatus === partialPayment.payment_id}
              >
                {updatingStatus === partialPayment.payment_id
                  ? "Đang lưu..."
                  : "Lưu số tiền đã thu"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleting && (
        <div
          className="payment-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleting(null);
          }}
        >
          <section
            className="payment-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-payment-title"
          >
            <span>🗑️</span>
            <h2 id="delete-payment-title">Xóa khoản thu?</h2>
            <p>
              Xóa khoản thu{" "}
              <strong>
                {String(deleting.billing_month).slice(0, 7)} ·{" "}
                {deleting.room_code}
              </strong>
              ? Thao tác này không thể hoàn tác.
            </p>
            <div>
              <button
                type="button"
                className="payment-cancel"
                onClick={() => setDeleting(null)}
                disabled={saving}
              >
                Giữ lại
              </button>
              <button
                type="button"
                className="payment-confirm-delete"
                onClick={deletePayment}
                disabled={saving}
              >
                {saving ? "Đang xóa..." : "Xóa khoản thu"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Payments;
