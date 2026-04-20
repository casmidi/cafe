import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Mail, Lock, Loader2, CheckCircle } from 'lucide-react';
import { API_URL } from '../config';
import useUIStore from '../store/useUIStore';
import { FALLBACK_LOGO_URL } from '../utils/logoUrl';

export default function CustomerRegister() {
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { showAlert, appSettings } = useUIStore(); // Use App Settings

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await axios.post(API_URL + 'auth/customer-register', formData);
            if (res.data.status) {
                showAlert('success', 'Berhasil', 'Akun berhasil dibuat. Silakan login.');
                navigate('/member/login');
            } else {
                showAlert('error', 'Gagal', res.data.message);
            }
        } catch (error) {
            showAlert('error', 'Error', error.response?.data?.message || 'Terjadi kesalahan.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 font-sans">
            <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center border border-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-brand-primary"></div>
                <div className="mb-6 flex justify-center">
                    <img
                        src={appSettings?.logo_url || FALLBACK_LOGO_URL}
                        alt="Logo"
                        className="h-12 w-auto object-contain"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_LOGO_URL;
                        }}
                    />
                </div>
                <h2 className="text-2xl font-bold text-brand-darkest mb-2 mt-2">Daftar Member</h2>
                <p className="text-gray-500 text-sm mb-8">Bergabung dan nikmati keuntungannya.</p>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Nama Lengkap" className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-primary" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="tel" placeholder="Nomor HP (08...)" className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-primary" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="email" placeholder="Email (Wajib)" className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-primary" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="password" placeholder="Password" className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-primary" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 transition-transform">
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />} Daftar
                    </button>
                </form>

                <div className="mt-6 text-sm text-gray-500">
                    Sudah punya akun? <Link to="/member/login" className="text-brand-primary font-bold hover:underline">Login</Link>
                </div>
            </div>
        </div>
    );
}