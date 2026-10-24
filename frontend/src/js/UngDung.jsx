import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./DangNhap";
import ForgotPassword from "./QuenMatKhau";
import Dashboard from "./TongQuan";
import Rooms from "./QuanLyPhong";
import AddRoom from "./ThemPhong";
import EditRoom from "./SuaPhong";
import RoomDetail from "./ChiTietPhong";
import Tenants from "./QuanLyKhachThue";
import Contracts from "./HopDong";
import Payments from "./ThuTien";
import Services from "./DichVu";
import Employees from "./QuanLyTaiKhoan";
import EmployeeDashboard from "./TongQuanNhanVien";
import { getCurrentUser } from "../PhanQuyen";
import { LogoutProvider } from "./XacNhanDangXuat";
import AddRoomType from "./ThemLoaiPhong";
function App() {
  return (
    <BrowserRouter>
      <LogoutProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={Number(getCurrentUser()?.roleId) === 3 ? <Navigate to="/employee" replace /> : <Dashboard />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/add" element={<AddRoom />} />
        <Route path="/room-types/add" element={<AddRoomType />} />
        <Route path="/rooms/edit/:id" element={<EditRoom />} />
        <Route path="/rooms/:id" element={<RoomDetail />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/services" element={<Services />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employee" element={Number(getCurrentUser()?.roleId) === 3 ? <EmployeeDashboard /> : <Navigate to="/dashboard" replace />} />
      </Routes>
      </LogoutProvider>
    </BrowserRouter>
  );
}

export default App;
