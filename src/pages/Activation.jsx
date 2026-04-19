import { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Key, Loader2, Lock } from 'lucide-react';
import { API_URL } from '../config';

export default function Activation() {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleActivate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await axios.post(API_URL + 'license/activate', {
                purchase_code: code
            });

            if (res.data.status) {
                alert("Aktivasi Berhasil! Selamat datang di Cafe 86.");
                window.location.reload(); // Reload untuk memicu cek lisensi ulang di App.jsx
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menghubungi server verifikasi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-50 rounded-full">
                        <ShieldCheck className="w-12 h-12 text-brand-primary" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Aktivasi Aplikasi</h2>
                <p className="text-center text-gray-500 text-sm mb-8">
                    Masukkan Purchase Code Anda untuk mengaktifkan lisensi Cafe 86 di domain ini.
                </p>

                <form onSubmit={handleActivate} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Purchase Code</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Key className="h-5 w-5 text-gray-300" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all font-mono"
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                            <Lock size={16} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-primary/30 text-sm font-bold text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Aktifkan Sekarang'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-8">
                    Cafe 86 v1.2.0 &copy; 2024
                </p>
            </div>
        </div>
    );
}