import { useNavigate } from "react-router-dom";
import { FiHome, FiGrid, FiUsers, FiFileText, FiDollarSign, FiTool, FiArrowRight } from "react-icons/fi";
import { useLogoutConfirmation } from "./XacNhanDangXuat";
import { getCurrentUser } from "../PhanQuyen";
import "../css/TongQuan.css";
import "../css/TongQuanNhanVien.css";

const workAreas = [
  { title: "Quản lý phòng", description: "Xem phòng và công việc liên quan.", icon: FiGrid, path: "/rooms", tone: "blue" },
  { title: "Khách thuê", description: "Tra cứu hồ sơ và thông tin liên hệ.", icon: FiUsers, path: "/tenants", tone: "violet" },
  { title: "Hợp đồng", description: "Theo dõi hợp đồng và thời hạn thuê.", icon: FiFileText, path: "/contracts", tone: "cyan" },
  { title: "Thu tiền", description: "Ghi nhận tiền phòng, điện và nước.", icon: FiDollarSign, path: "/payments", tone: "green" },
  { title: "Dịch vụ sửa chữa", description: "Theo dõi vấn đề cần xử lý trong phòng.", icon: FiTool, path: "/services", tone: "orange" },
];

function EmployeeDashboard() {
  const navigate = useNavigate();
  const requestLogout = useLogoutConfirmation();
  const user = getCurrentUser();
  return <div className="dashboard-layout employee-workspace">
    <aside className="sidebar employee-sidebar">
      <div className="sidebar-logo"><div className="logo-icon">🏠</div><h2>NHÀ TRỌ SÁU BÁ</h2></div>
      <div className="employee-sidebar-label">KHU VỰC NHÂN VIÊN</div>
      <ul className="sidebar-menu">
        <li className="menu-item active"><span><FiHome /></span> Tổng quan</li>
        {workAreas.map((area) => { const Icon = area.icon; return <li className="menu-item" key={area.path} onClick={() => navigate(area.path)}><span><Icon /></span> {area.title}</li>; })}
        <li className="menu-item logout-btn" onClick={requestLogout}><span className="logout-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H19a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-5" /><polyline points="7 16 3 12 7 8" /><line x1="3" y1="12" x2="15" y2="12" /></svg></span> Đăng xuất</li>
      </ul>
      <div className="sidebar-footer"><p>Không gian làm việc nhân viên</p></div>
    </aside>
    <main className="main-content employee-home-main">
      <header className="employee-home-header">
        <div><span className="employee-home-kicker">TRANG NHÂN VIÊN</span><h1>Xin chào, {user?.fullName || "bạn"} 👋</h1><p>Chọn một mục bên dưới để bắt đầu công việc hôm nay.</p></div>
        <div className="employee-profile-badge"><span className="employee-avatar">{String(user?.fullName || "NV").trim().charAt(0).toUpperCase()}</span><span><strong>{user?.fullName || "Nhân viên"}</strong><small>Nhân viên</small></span></div>
      </header>
      <section className="employee-welcome-banner"><div className="employee-welcome-copy"><span>NHÀ TRỌ SÁU BÁ</span><h2>Công việc hôm nay</h2><p>Quản lý các yêu cầu, hồ sơ và khoản thu tại một nơi.</p></div><div className="employee-welcome-art" aria-hidden="true"><FiHome /></div></section>
      <section className="employee-work-section"><div className="employee-work-heading"><div><h2>Khu vực làm việc</h2><p>Các chức năng dành cho nhân viên</p></div><span>{workAreas.length} chức năng</span></div>
        <div className="employee-work-grid">{workAreas.map((area) => { const Icon = area.icon; return <button type="button" className={`employee-work-card tone-${area.tone}`} key={area.path} onClick={() => navigate(area.path)}><span className="employee-work-icon"><Icon /></span><span className="employee-work-card-copy"><strong>{area.title}</strong><small>{area.description}</small></span><span className="employee-work-arrow"><FiArrowRight /></span></button>; })}</div>
      </section>
    </main>
  </div>;
}

export default EmployeeDashboard;
