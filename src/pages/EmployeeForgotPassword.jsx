import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, Key, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';
import useUIStore from '../store/useUIStore';

export default function EmployeeForgotPassword() {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState(1); // 1: Request, 2: Reset
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { showAlert } = useUIStore();

    const handleRequest = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await axios.post(API_URL + 'auth/forgot', { email });
            if (res.data.status) {
                showAlert('success', 'Email Terkirim', res.data.message);
                setStep(2);
            } else {
                showAlert('error', 'Gagal', res.data.message);
            }
        } catch (error) {
            showAlert('error', 'Error', error.response?.data?.message || 'Gagal mengirim request.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await axios.post(API_URL + 'auth/reset', { token: otp, new_password: newPassword });
            if (res.data.status) {
                showAlert('success', 'Sukses', 'Password berhasil diubah. Silakan login.');
                setTimeout(() => {
                    window.location.href = '/'; // Redirect ke login utama
                }, 1500);
            } else {
                showAlert('error', 'Gagal', res.data.message);
            }
        } catch (error) {
            showAlert('error', 'Error', error.response?.data?.message || 'Gagal reset password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 font-sans">
            <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center border border-white">
                <div className="flex justify-start mb-4">
                    <Link to="/" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"><ArrowLeft size={20}/></Link>
                </div>
                
                <h2 className="text-2xl font-bold text-brand-darkest mb-2">Reset Password Karyawan</h2>
                <p className="text-gray-500 text-sm mb-8">{step === 1 ? 'Masukkan email terdaftar Anda untuk menerima kode OTP.' : 'Masukkan kode OTP yang dikirim ke email Anda.'}</p>

                {step === 1 ? (
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                                type="email" 
                                placeholder="Email Karyawan" 
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-primary font-medium" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark flex items-center justify-center gap-2 disabled:opacity-70 transition-transform active:scale-95"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Kirim Kode OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-700 mb-2 text-left border border-blue-100">
                            Kode OTP telah dikirim ke <b>{email}</b>.
                        </div>
                        
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Kode OTP" 
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-primary font-mono tracking-widest text-center font-bold text-lg"
                                value={otp} 
                                onChange={e => setOtp(e.target.value)} 
                                maxLength={6}
                                required 
                                autoFocus
                            />
                        </div>
                        
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                                type="password" 
                                placeholder="Password Baru" 
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-primary font-medium"
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-70 transition-transform active:scale-95"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Simpan Password Baru'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}