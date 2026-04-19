import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, Lock, History, PlayCircle, StopCircle, AlertTriangle, CheckCircle, Banknote, User } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

export default function Shift() {
    const [activeShift, setActiveShift] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [startCash, setStartCash] = useState('');
    const [endCash, setEndCash] = useState('');
    const [note, setNote] = useState('');

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');
    const navigate = useNavigate(); // Hook navigasi

    useEffect(() => {
        fetchShiftData();
    }, []);

    const fetchShiftData = async () => {
        setIsLoadingData(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const resCurrent = await axios.get(API_URL + 'shift/current', config);
            if (resCurrent.data.status) {
                setActiveShift(resCurrent.data.data);
            } else {
                setActiveShift(null);
            }

            const resHist = await axios.get(API_URL + 'shift/history', config);
            if (resHist.data.status) {
                setHistory(resHist.data.data);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleOpenShift = async (e) => {
        e.preventDefault();
        if (!startCash) return showAlert('error', 'Error', 'Masukkan modal awal');
        
        showConfirm('Buka Shift?', `Modal awal: Rp ${parseInt(startCash).toLocaleString()}`, async () => {
            showLoading('Membuka Shift...');
            try {
                await axios.post(API_URL + 'shift/open', { start_cash: startCash }, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Shift dibuka. Selamat bekerja!');
                fetchShiftData();
            } catch (error) {
                const msg = error.response?.data?.message || 'Gagal membuka shift';
                
                // Jika error karena belum absen (403 Forbidden dari backend)
                if (error.response?.status === 403) {
                    showConfirm(
                        'Akses Ditolak', 
                        'Anda belum melakukan absensi masuk hari ini. Silakan absen wajah terlebih dahulu.', 
                        () => navigate('/attendance') // Arahkan ke halaman Absensi
                    );
                } else {
                    showAlert('error', 'Gagal', msg);
                }
            } finally {
                hideLoading();
            }
        });
    };

    const handleCloseShift = async (e) => {
        e.preventDefault();
        if (!endCash) return showAlert('error', 'Error', 'Masukkan jumlah uang di laci');

        const expected = parseFloat(activeShift.start_cash) + parseFloat(activeShift.current_sales);
        const actual = parseFloat(endCash);
        const diff = actual - expected;
        
        let confirmMsg = `Uang di sistem: Rp ${expected.toLocaleString()}\nUang fisik: Rp ${actual.toLocaleString()}`;
        if (diff !== 0) confirmMsg += `\n\nSELISIH: Rp ${diff.toLocaleString()} ${diff < 0 ? '(KURANG)' : '(LEBIH)'}`;

        showConfirm('Tutup Shift?', confirmMsg, async () => {
            showLoading('Menutup Shift...');
            try {
                await axios.post(API_URL + 'shift/close', { end_cash_actual: endCash, note: note }, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Selesai', 'Shift ditutup. Laporan tersimpan.');
                fetchShiftData();
                setEndCash('');
                setNote('');
            } catch (error) {
                showAlert('error', 'Gagal', 'Gagal menutup shift');
            } finally {
                hideLoading();
            }
        });
    };

    if (isLoadingData) return <div className="p-10 text-center text-gray-500">Memuat data shift...</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl">Manajemen Shift Kasir</h3>
                    <p className="text-gray-500 text-sm">Kelola modal awal dan setoran akhir.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* PANEL KIRI: STATUS SHIFT */}
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 ${activeShift ? 'bg-green-500' : 'bg-red-500'}`}></div>

                    {activeShift ? (
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                                    <Lock size={32} />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold text-gray-800">Shift Sedang Aktif</h4>
                                    <p className="text-sm text-gray-500">Dimulai: {new Date(activeShift.start_time).toLocaleString('id-ID')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Modal Awal</p>
                                    <p className="text-xl font-bold text-gray-700">Rp {parseInt(activeShift.start_cash).toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <p className="text-xs text-blue-400 uppercase font-bold mb-1">Penjualan Tunai (Saat Ini)</p>
                                    <p className="text-xl font-bold text-blue-700">Rp {parseInt(activeShift.current_sales).toLocaleString('id-ID')}</p>
                                </div>
                            </div>

                            <form onSubmit={handleCloseShift} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">Hitung Uang Fisik di Laci (Aktual)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                                        <input 
                                            type="number" required 
                                            className="w-full pl-12 pr-4 py-3 text-lg font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                            placeholder="0"
                                            value={endCash} onChange={e => setEndCash(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan (Opsional)</label>
                                    <textarea 
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" 
                                        rows="2" placeholder="Misal: Kurang 500 perak"
                                        value={note} onChange={e => setNote(e.target.value)}
                                    ></textarea>
                                </div>
                                <button type="submit" className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-transform active:scale-95 flex items-center justify-center gap-2">
                                    <StopCircle size={20} /> Tutup Shift & Setor
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="relative z-10 text-center py-6">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wallet size={40} className="text-gray-400" />
                            </div>
                            <h4 className="text-2xl font-bold text-gray-800 mb-2">Shift Belum Dibuka</h4>
                            <p className="text-gray-500 mb-8 max-w-xs mx-auto">Anda harus memasukkan modal awal kasir sebelum dapat melakukan transaksi.</p>

                            <form onSubmit={handleOpenShift} className="max-w-sm mx-auto space-y-4">
                                <div className="relative text-left">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Modal Awal (Petty Cash)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                                        <input 
                                            type="number" required autoFocus
                                            className="w-full pl-12 pr-4 py-3 text-lg font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="0"
                                            value={startCash} onChange={e => setStartCash(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-transform active:scale-95 flex items-center justify-center gap-2">
                                    <PlayCircle size={20} /> Buka Shift Sekarang
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* PANEL KANAN: RIWAYAT SHIFT */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <History size={20} className="text-brand-primary" /> Riwayat Shift Terakhir
                    </h4>
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {history.length === 0 ? (
                            <p className="text-center text-gray-400 py-10">Belum ada riwayat shift.</p>
                        ) : history.map((log) => (
                            <div key={log.id} className="p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{new Date(log.start_time).toLocaleDateString('id-ID')}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(log.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                            {log.end_time ? new Date(log.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Aktif'}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {log.status}
                                    </span>
                                </div>
                                
                                {log.status === 'closed' && (
                                    <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t border-dashed border-gray-200">
                                        <div>
                                            <span className="block text-gray-400">Sistem</span>
                                            <span className="font-bold text-gray-700">Rp {parseInt(log.end_cash_expected).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400">Aktual</span>
                                            <span className="font-bold text-gray-700">Rp {parseInt(log.end_cash_actual).toLocaleString()}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-gray-400">Selisih</span>
                                            <span className={`font-bold ${log.difference < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {parseInt(log.difference).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                                    <User size={10}/> {log.user_name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}