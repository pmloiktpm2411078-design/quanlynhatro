import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import "../css/XacNhanDangXuat.css";

const LogoutContext = createContext(null);

export function LogoutProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const stayButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    stayButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function completeLogout() {
    setIsOpen(false);
    localStorage.clear();
    navigate("/");
  }

  return <LogoutContext.Provider value={() => setIsOpen(true)}>
    {children}
    {isOpen && <div className="logout-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section className="logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description">
        <div className="logout-dialog-icon"><FiLogOut /></div>
        <span className="logout-dialog-eyebrow">XÁC NHẬN</span>
        <h2 id="logout-dialog-title">Đăng xuất khỏi hệ thống?</h2>
        <p id="logout-dialog-description">Bạn có chắc muốn kết thúc phiên làm việc hiện tại không?</p>
        <div className="logout-dialog-actions">
          <button ref={stayButtonRef} className="logout-dialog-stay" type="button" onClick={() => setIsOpen(false)}>Ở lại</button>
          <button className="logout-dialog-confirm" type="button" onClick={completeLogout}><FiLogOut /> Đăng xuất</button>
        </div>
      </section>
    </div>}
  </LogoutContext.Provider>;
}

export function useLogoutConfirmation() {
  const requestLogout = useContext(LogoutContext);
  if (!requestLogout) throw new Error("useLogoutConfirmation phải được dùng bên trong LogoutProvider.");
  return requestLogout;
}
