import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../css/DangNhap.css';

function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            // Gọi đúng API đăng nhập của Backend
            const response = await axios.post(
                'http://localhost:3000/api/login',
                {
                    username: username,
                    password: password,
                }
            );

            // Backend trả về token khi đăng nhập thành công
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);

                // Lưu thông tin người dùng nếu cần sử dụng ở trang khác
                if (response.data.user) {
                    localStorage.setItem(
                        'user',
                        JSON.stringify(response.data.user)
                    );
                }

                // Chuyển hướng ngay lập tức sang dashboard, không hiện thông báo chờ
                navigate(Number(response.data.user?.roleId) === 3 ? '/employee' : '/dashboard');
            } else {
                setMessage(
                    response.data.message ||
                    'Đăng nhập thất bại. Vui lòng thử lại.'
                );
            }
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);

            if (error.response) {
                setMessage(
                    error.response.data.message ||
                    'Đăng nhập thất bại. Vui lòng thử lại.'
                );
            } else {
                setMessage(
                    'Không thể kết nối đến máy chủ. Vui lòng kiểm tra Backend.'
                );
            }
        }
    };

    return (
        <div className="login-page-wrapper">
            <button
                onClick={() => navigate('/')}
                className="login-home-btn"
            >
                &larr; Trang chủ
            </button>

            <main className="login-main-container">
                <div className="login-left-content">
                    <h2>
                        CHÀO MỪNG ĐẾN VỚI
                        <br />
                        <span>Nhà trọ Sáu Bá</span>
                    </h2>

                    <p>
                        Hệ thống quản lý nhà trọ thông minh và tiện lợi,
                        <br />
                        giúp vận hành nhanh chóng và hiệu quả.
                    </p>
                </div>

                <div className="login-right-box">
                    <h3>ĐĂNG NHẬP</h3>
                    <p className="login-subtitle">
                        Hệ thống quản lý nhà trọ Sáu Bá
                    </p>

                    {message && (
                        <p className="login-message">{message}</p>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="login-input-group">
                            <label>Tên đăng nhập</label>

                            <div className="login-input-wrapper">
                                <FaUser className="login-input-icon" />

                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    placeholder="Nhập tên đăng nhập"
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-input-group">
                            <label>Mật khẩu</label>

                            <div className="login-input-wrapper">
                                <FaLock className="login-input-icon" />

                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Nhập mật khẩu"
                                    required
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="login-eye-btn"
                                    aria-label={
                                        showPassword
                                            ? 'Ẩn mật khẩu'
                                            : 'Hiện mật khẩu'
                                    }
                                >
                                    {showPassword
                                        ? <FaEyeSlash size={18} />
                                        : <FaEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="login-forgot-row">
                            <Link to="/forgot-password">
                                Quên mật khẩu?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className="login-submit-btn"
                        >
                            Đăng nhập
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
export default Login;