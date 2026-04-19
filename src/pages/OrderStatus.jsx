import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, Loader2, Home } from 'lucide-react';
import { API_URL } from '../config';

export default function OrderStatus() {
    const [searchParams] = useSearchParams();
    const invoice = searchParams.get('invoice');
    const [status, setStatus] = useState('loading'); // loading, paid, pending, failed
    const [orderData, setOrderData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (invoice) {
            checkStatus();
        } else {
            setStatus('failed');
        }
    }, [invoice]);

    const checkStatus = async () => {
        try {
            const res = await axios.get(`${API_URL}public/status&invoice=${invoice}`);
            if (res.data.status) {
                setOrderData(res.data.data);
                if (res.data.data.payment_status === 'paid') {
                    setStatus('paid');
                } else if (res.data.data.payment_status === 'void' || res.data.data.payment_status === 'failed') {
                    setStatus('failed');
                } else {
                    setStatus('pending');
                }
            } else {
                setStatus('failed');
            }
        } catch (error) {
            console.error(error);
            setStatus('failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden p-8 text-center">
                {status === 'loading' && (
                    <div className="py-10">
                        <Loader2 className="w-16 h-16 mx-auto text-brand-primary animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-gray-700">Mengecek Pembayaran...</h2>
                    </div>
                )}

                {status === 'paid' && (
                    <div className="py-6 animate-in zoom-in duration-300">
                        <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Pembayaran Berhasil!</h2>
                        <p className="text-gray-500 mb-6">Terima kasih, pesanan Anda <b>{invoice}</b> sedang diproses oleh dapur kami.</p>
                        
                        <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-500 text-sm">Total Bayar</span>
                                <span className="font-bold text-gray-800">Rp {parseInt(orderData?.total_amount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 text-sm">Waktu</span>
                                <span className="font-medium text-gray-800">{new Date(orderData?.created_at).toLocaleString()}</span>
                            </div>
                        </div>

                        <button onClick={() => window.location.href = '/order'} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark transition-colors flex items-center justify-center gap-2">
                            <Home size={18}/> Kembali ke Menu
                        </button>
                    </div>
                )}

                {status === 'pending' && (
                    <div className="py-6">
                        <Clock className="w-20 h-20 mx-auto text-orange-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Menunggu Konfirmasi</h2>
                        <p className="text-gray-500 mb-6">Pembayaran Anda sedang diproses. Mohon tunggu sebentar atau refresh halaman ini.</p>
                        <button onClick={checkStatus} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-full font-bold hover:bg-gray-200">
                            Cek Lagi
                        </button>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="py-6">
                        <XCircle className="w-20 h-20 mx-auto text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Pembayaran Gagal</h2>
                        <p className="text-gray-500 mb-6">Terjadi kesalahan atau pembayaran belum selesai. Silakan coba lagi.</p>
                        <button onClick={() => navigate(-1)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
                            Coba Lagi
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}