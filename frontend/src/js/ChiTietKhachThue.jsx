import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = "http://localhost:3000/api";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

function formatDate(value) {
  if (!value) return "---";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN");
}

function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [tenantResponse, contractResponse, paymentResponse] =
          await Promise.all([
            fetch(`${API}/tenants/${id}`, { headers }),
            fetch(`${API}/contracts?tenant_id=${id}`, { headers }),
            fetch(`${API}/payments?tenant_id=${id}`, { headers }),
          ]);

        const tenantResult = await tenantResponse.json();
        const contractResult = await contractResponse.json();
        const paymentResult = await paymentResponse.json();

        if (!tenantResponse.ok) {
          throw new Error(
            tenantResult.message || "Không thể tải thông tin khách thuê.",
          );
        }

        if (!contractResponse.ok) {
          throw new Error(contractResult.message || "Không thể tải hợp đồng.");
        }

        if (!paymentResponse.ok) {
          throw new Error(
            paymentResult.message || "Không thể tải lịch sử thanh toán.",
          );
        }

        setTenant(tenantResult.data);
        setContracts(contractResult.data || []);
        setPayments(paymentResult.data || []);
      } catch (err) {
        setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading) {
    return <div style={{ padding: 30 }}>Đang tải thông tin khách thuê...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 30 }}>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => navigate("/tenants")}>Quay lại danh sách</button>
      </div>
    );
  }

  if (!tenant) {
    return <div>Không tìm thấy khách thuê.</div>;
  }

  const totalDebt = payments.reduce(
    (sum, payment) => sum + Number(payment.remaining_amount || 0),
    0,
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.paid_amount || 0),
    0,
  );

  return (
    <div
      style={{
        padding: "30px",
        background: "#f3f4f6",
        minHeight: "100vh",
        color: "#1f2937",
      }}
    >
      <button
        onClick={() => navigate("/tenants")}
        style={{
          padding: "10px 18px",
          marginBottom: 20,
          cursor: "pointer",
        }}
      >
        ← Quay lại danh sách
      </button>

      <h1>Chi tiết khách thuê</h1>

      {/* THÔNG TIN CÁ NHÂN */}
      <section style={sectionStyle}>
        <h2>Thông tin cá nhân</h2>

        <Info label="Mã khách thuê" value={tenant.tenant_id} />
        <Info label="Họ và tên" value={tenant.full_name} />
        <Info label="Ngày sinh" value={formatDate(tenant.date_of_birth)} />
        <Info label="CCCD/CMND" value={tenant.identity_number} />
        <Info label="Số điện thoại" value={tenant.phone} />
        <Info label="Email" value={tenant.email} />
        <Info label="Giới tính" value={tenant.gender} />
        <Info label="Địa chỉ" value={tenant.address} />
        <Info label="Thông tin liên hệ thêm" value={tenant.contact_info} />
      </section>

      {/* HỢP ĐỒNG */}
      <section style={sectionStyle}>
        <h2>Danh sách hợp đồng</h2>

        {contracts.length === 0 ? (
          <p>Khách thuê chưa có hợp đồng.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th>Mã hợp đồng</th>
                  <th>Phòng</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                  <th>Tiền thuê</th>
                  <th>Tiền cọc</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>

              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.contract_id}>
                    <td>{contract.contract_code || contract.contract_id}</td>
                    <td>
                      {contract.room_code || contract.room_number || "---"}
                    </td>
                    <td>{formatDate(contract.start_date)}</td>
                    <td>{formatDate(contract.end_date)}</td>
                    <td>{formatMoney(contract.rent_amount)}</td>
                    <td>{formatMoney(contract.deposit_amount)}</td>
                    <td>{contract.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* TỔNG QUAN THANH TOÁN */}
      <section style={sectionStyle}>
        <h2>Tổng quan thanh toán</h2>

        <Info label="Tổng số phiếu thanh toán" value={payments.length} />
        <Info label="Tổng tiền đã thanh toán" value={formatMoney(totalPaid)} />
        <Info label="Tổng công nợ còn lại" value={formatMoney(totalDebt)} />
      </section>

      {/* LỊCH SỬ THANH TOÁN */}
      <section style={sectionStyle}>
        <h2>Lịch sử thanh toán</h2>

        {payments.length === 0 ? (
          <p>Khách thuê chưa phát sinh phiếu thanh toán.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Hợp đồng</th>
                  <th>Phòng</th>
                  <th>Tháng thanh toán</th>
                  <th>Tổng tiền</th>
                  <th>Đã trả</th>
                  <th>Còn nợ</th>
                  <th>Hạn thanh toán</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td>{payment.payment_id}</td>
                    <td>{payment.contract_code || payment.contract_id}</td>
                    <td>{payment.room_code || "---"}</td>
                    <td>{formatDate(payment.billing_month)}</td>
                    <td>{formatMoney(payment.total_amount)}</td>
                    <td>{formatMoney(payment.paid_amount)}</td>
                    <td>{formatMoney(payment.remaining_amount)}</td>
                    <td>{formatDate(payment.due_date)}</td>
                    <td>{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <p style={{ margin: "12px 0" }}>
      <strong>{label}: </strong>
      {value || "---"}
    </p>
  );
}

const sectionStyle = {
  background: "#fff",
  padding: "22px",
  marginTop: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
};

export default TenantDetail;
