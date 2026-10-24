import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AddRoomType() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type_code: "",
    type_name: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      // Lưu ý: Đảm bảo backend đang chạy ở cổng 3000, nếu không hãy sửa lại số cổng
      const response = await fetch("http://localhost:3000/api/room-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Không thể thêm loại phòng.");
      }
      
      alert("Thêm loại phòng thành công!");
      navigate("/rooms/add"); 
    } catch (err) {
      setError(err.message || "Lỗi kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { 
    width: "100%", 
    padding: "10px", 
    marginTop: "6px",
    marginBottom: "16px", 
    borderRadius: "6px", 
    border: "1px solid #ccc",
    boxSizing: "border-box",
    fontSize: "15px"
  };

  return (
    <div style={{ 
      maxWidth: "500px", 
      margin: "30px auto", 
      padding: "25px", 
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#fff", 
      borderRadius: "10px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
    }}>
      <button 
        type="button"
        onClick={() => navigate("/rooms/add")} 
        style={{ 
          padding: "9px 14px",
          marginBottom: "15px", 
          cursor: "pointer",
          border: "1px solid #ccc",
          borderRadius: "4px",
          backgroundColor: "#f9fafb"
        }}
      >
        ← Quay lại Thêm phòng
      </button>
      
      <h2 style={{ marginTop: "0" }}>THÊM LOẠI PHÒNG MỚI</h2>
      
      {error && <div style={{ color: "#b91c1c", marginBottom: "15px" }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <label>
          Mã loại phòng <span style={{ color: "red" }}>*</span>
        </label>
        <input 
          style={inputStyle} 
          name="type_code" 
          value={form.type_code} 
          onChange={handleChange} 
          placeholder="Ví dụ: VIP, THUONG"
          required 
        />
        
        <label>
          Tên loại phòng <span style={{ color: "red" }}>*</span>
        </label>
        <input 
          style={inputStyle} 
          name="type_name" 
          value={form.type_name} 
          onChange={handleChange} 
          placeholder="Ví dụ: Phòng Đơn"
          required 
        />
        
        <button 
          type="submit" 
          disabled={submitting} 
          style={{ 
            padding: "12px 20px", 
            backgroundColor: submitting ? "#999" : "#2563eb", 
            color: "white", 
            border: "none", 
            borderRadius: "6px", 
            cursor: submitting ? "not-allowed" : "pointer",
            fontSize: "16px"
          }}
        >
          {submitting ? "Đang lưu..." : "Lưu loại phòng"}
        </button>
      </form>
    </div>
  );
}

export default AddRoomType;