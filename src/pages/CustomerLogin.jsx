import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Loader2, ArrowRight, Mail, ShieldCheck, User } from 'lucide-react';
import { API_URL } from '../config';
import useUIStore from '../store/useUIStore';

export default function CustomerLogin() {
    const [identifier, setIdentifier] = useState(''); // HP atau Email
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { showAlert, appSettings } = useUIStore(); // Use appSettings

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await axios.post(API_URL + 'auth/customer-login', { identifier, password });
            if (res.data.status) {
                localStorage.setItem('customerToken', res.data.token);
                localStorage.setItem('customerData', JSON.stringify(res.data.data));
                navigate('/member/dashboard');
            } else {
                showAlert('error', 'Gagal', res.data.message);
            }
        } catch (error) {
            showAlert('error', 'Error', error.response?.data?.message || 'Terjadi kesalahan koneksi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 font-sans">
            <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center border border-white">
                <img
                    src={appSettings?.logo_url || "/taskora-logo.png?v=86"}
                    alt="Logo"
                    className="h-16 mx-auto mb-6 object-contain"
                />
                <h2 className="text-2xl font-bold text-brand-darkest mb-2">Member Area</h2>
                <p className="text-gray-500 text-sm mb-8">Masuk untuk cek poin & promo spesial.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="No HP atau Email"
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary font-medium"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary font-medium"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="text-right">
                        <Link to="/member/forgot-password" className="text-xs text-brand-primary hover:underline font-medium">
                            Lupa Password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark flex items-center justify-center gap-2 disabled:opacity-70 transition-transform active:scale-95"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Masuk'} {!isLoading && <ArrowRight size={20} />}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-50">
                    <p className="text-sm text-gray-500">Belum punya akun?</p>
                    <Link to="/member/register" className="text-brand-primary font-bold hover:underline">Daftar Sekarang</Link>
                </div>
            </div>
        </div>
    );
}