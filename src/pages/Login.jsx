import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';
import { FALLBACK_LOGO_URL, normalizeLogoUrl } from '../utils/logoUrl';

export default function Login() {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const navigate = useNavigate();
    const { showLoading, hideLoading, showAlert, appSettings } = useUIStore();

    // Derive logo URL: prefer appSettings, fallback to cached, then default
    const getLogoUrl = () => {
        if (appSettings?.logo_url) return appSettings.logo_url;

        const cached = localStorage.getItem('cachedOutletInfo');
        if (cached) {
            try {
                const data = JSON.parse(cached);
                return data.logo_url || FALLBACK_LOGO_URL;
            } catch (e) {
                return FALLBACK_LOGO_URL;
            }
        }

        return FALLBACK_LOGO_URL;
    };

    const logoUrl = getLogoUrl();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        showLoading('Sedang memverifikasi akun...');

        try {
            const response = await axios.post(API_URL + 'auth/login', formData);

            if (response.data.status) {
                const { token, user } = response.data;

                try {
                    const decoded = jwtDecode(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        throw new Error("Token kedaluwarsa.");
                    }

                    localStorage.setItem('token', token);
                    localStorage.setItem('user', JSON.stringify(user));

                    hideLoading();
                    showAlert('success', 'Login Berhasil', `Selamat datang kembali, ${user.name}!`);

                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 1500);

                } catch (tokenError) {
                    hideLoading();
                    showAlert('error', 'Token Invalid', 'Gagal memproses token keamanan.');
                }
            }
        } catch (err) {
            hideLoading();
            const msg = err.response?.data?.message || 'Terjadi kesalahan koneksi ke server.';
            showAlert('error', 'Login Gagal', msg);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-brand-accent/20 w-full max-w-md border border-white">
                <div className="text-center mb-8">
                    <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-20 mx-auto mb-4 object-contain"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_LOGO_URL;
                        }}
                    />
                    <p className="text-gray-400 text-sm font-medium">Silakan login untuk memulai shift</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Username</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-300" />
                            </div>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all"
                                placeholder="Masukkan username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-300" />
                            </div>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all"
                                placeholder="Masukkan password"
                                required
                            />
                        </div>
                        <div className="text-right mt-2">
                            <Link to="/auth/forgot" className="text-xs text-brand-primary hover:underline font-medium">
                                Lupa Password?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-primary/30 text-sm font-bold text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all transform hover:-translate-y-1"
                    >
                        Masuk Dashboard
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-300">&copy; 2024 {appSettings?.name || 'Taskora Resto System'}</p>
                </div>
            </div>
        </div>
    );
}