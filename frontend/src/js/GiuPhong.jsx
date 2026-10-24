import React, { useState } from "react";
import "../css/GiuPhong.css"; // Nhúng file CSS riêng

export default function GiuPhong({ phong, room, onClose, onSuccess }) {
  // Hỗ trợ nhận prop là `phong` hoặc `room`
  const targetRoom = phong || room;

  const [tenantId, setTenantId] = useState("");
  const [depositAmount, setDepositAmount] = useState(500000);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        "http://localhost:5000/api/giu-phong/dat-coc",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_id: targetRoom?.room_id || targetRoom?.id,
            tenant_id: tenantId,
            deposit_amount: depositAmount,
            created_by: 1, // ID nhân viên thao tác
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        alert(
          "Giữ phòng thành công! Hạn chót 120h: " +
            new Date(data.expire_time).toLocaleString("vi-VN"),
        );
        onSuccess();
        onClose();
      } else {
        alert(data.message || "Đặt giữ phòng thất bại");
      }
    } catch (error) {
      console.error(error);
      alert("Không thể kết nối đến máy chủ");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>
          Đặt cọc Giữ phòng:{" "}
          {targetRoom?.room_name ||
            targetRoom?.room_number ||
            targetRoom?.ten_phong}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Mã Khách thuê (Tenant ID):</label>
            <input
              type="number"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Số tiền cọc (VNĐ):</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              required
            />
          </div>

          <p className="note-text">
            ⏱ Phòng sẽ chuyển sang trạng thái <b>HOLD</b> trong đúng 120 giờ (5
            ngày).
          </p>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-submit">
              Xác nhận Giữ phòng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
