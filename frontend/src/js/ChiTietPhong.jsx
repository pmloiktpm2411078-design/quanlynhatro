import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRoom = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/");
        return;
      }

      try {
        const response = await fetch(`http://localhost:3000/api/rooms/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/");
            return;
          }

          throw new Error(result.message || "Không thể tải thông tin phòng.");
        }

        setRoom(result.data);
      } catch (err) {
        setError(err.message || "Không thể kết nối đến máy chủ.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id, navigate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const statusMap = {
    AVAILABLE: "Còn trống",
    HOLD: "Đang giữ phòng",
    HELD: "Đang giữ phòng",
    OCCUPIED: "Đang có người thuê",
    PROCESSING: "Đang xử lý",
    MAINTENANCE: "Đang bảo trì",
  };

  const labelStyle = {
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "6px",
  };

  const valueStyle = {
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: 0,
    overflowWrap: "anywhere",
  };

  if (loading) {
    return <p style={{ padding: "30px" }}>Đang tải thông tin phòng...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: "30px", fontFamily: "Arial, sans-serif" }}>
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <button onClick={() => navigate("/rooms")}>
          ← Quay lại danh sách phòng
        </button>
      </div>
    );
  }

  if (!room) {
    return <p style={{ padding: "30px" }}>Không tìm thấy thông tin phòng.</p>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "30px 16px",
        backgroundColor: "#f1f5f9",
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
          padding: "28px",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <button
          onClick={() => navigate("/rooms")}
          style={{
            padding: "10px 14px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          ← Quay lại danh sách phòng
        </button>

        <h1 style={{ marginTop: "24px", color: "#1e3a8a" }}>CHI TIẾT PHÒNG</h1>

        <p style={{ color: "#64748b" }}>
          Thông tin chi tiết của phòng trọ trong hệ thống.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "24px",
            marginTop: "30px",
          }}
        >
          <div>
            <p style={labelStyle}>Mã phòng</p>
            <p style={valueStyle}>{room.room_code || "Chưa cập nhật"}</p>
          </div>

          <div>
            <p style={labelStyle}>Số phòng</p>
            <p style={valueStyle}>{room.room_number || "Chưa cập nhật"}</p>
          </div>

          <div>
            <p style={labelStyle}>Loại phòng</p>
            <p style={valueStyle}>{room.type_name || "Chưa phân loại"}</p>
          </div>

          <div>
            <p style={labelStyle}>Diện tích</p>
            <p style={valueStyle}>
              {room.area_m2 != null ? `${room.area_m2} m²` : "Chưa cập nhật"}
            </p>
          </div>

          <div>
            <p style={labelStyle}>Giá thuê mỗi tháng</p>
            <p style={{ ...valueStyle, color: "#15803d", fontSize: "20px" }}>
              {formatCurrency(room.listed_rent)}
            </p>
          </div>

          <div>
            <p style={labelStyle}>Trạng thái</p>
            <p style={valueStyle}>
              {statusMap[room.status] || room.status || "Chưa xác định"}
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "28px",
            padding: "18px",
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
          }}
        >
          <p style={labelStyle}>Mô tả phòng</p>
          <p
            style={{ marginBottom: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}
          >
            {room.description || "Chưa có mô tả cho phòng này."}
          </p>
        </div>

        <button
          onClick={() => navigate(`/rooms/edit/${room.room_id}`)}
          style={{
            marginTop: "24px",
            padding: "12px 18px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          ✏️ Sửa thông tin phòng
        </button>
      </div>
    </div>
  );
}

export default RoomDetail;
