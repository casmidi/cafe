import { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, CheckCircle, Calendar, FileText, Box, ArrowRight, AlertTriangle, History, PackageCheck, User, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Receiving() {
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
    const [pendingPO, setPendingPO] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);
    const [poItems, setPoItems] = useState([]);
    
    // History State
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (activeTab === 'pending') fetchPendingPO();
        if (activeTab === 'history') fetchHistoryLogs();
    }, [activeTab, historyPage]);

    const fetchPendingPO = async () => {
        try {
            const res = await axios.get(API_URL + 'purchasing/pending', { headers: { Authorization: `Bearer ${token}` } });
            if(res.data.status) setPendingPO(res.data.data);
        } catch (error) { console.error(error); }
    };

    const fetchHistoryLogs = async () => {
        showLoading('Memuat riwayat...');
        try {
            const res = await axios.get(`${API_URL}reports/stock&type=in&page=${historyPage}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(res.data.status) {
                setHistoryLogs(res.data.data);
                if (res.data.pagination) setHistoryTotalPages(res.data.pagination.total_pages);
            }
        } catch (error) { console.error(error); } finally { hideLoading(); }
    };

    const handleSelectPO = async (po) => {
        showLoading('Memuat detail PO...');
        try {
            const res = await axios.get(API_URL + 'purchasing/detail&id=' + po.id, { headers: { Authorization: `Bearer ${token}` } });
            if(res.data.status) {
                setSelectedPO(po);
                const items = res.data.data.map(item => ({
                    ...item,
                    qty: parseFloat(item.qty), 
                    received_qty: parseFloat(item.qty), 
                    price_per_unit: parseFloat(item.price_per_unit) 
                }));
                setPoItems(items);
            }
        } catch (error) { showAlert('error', 'Gagal', 'Gagal memuat detail'); } finally { hideLoading(); }
    };

    const handleQtyChange = (idx, val) => {
        const newItems = [...poItems];
        newItems[idx].received_qty = val; 
        setPoItems(newItems);
    };

    const handlePriceChange = (idx, val) => {
        const newItems = [...poItems];
        newItems[idx].price_per_unit = val;
        setPoItems(newItems);
    };

    const handleSubmitReceive = () => {
        const cleanItems = poItems.map(item => ({
            ...item,
            received_qty: parseFloat(item.received_qty) || 0,
            price_per_unit: parseFloat(item.price_per_unit) || 0
        }));

        showConfirm('Terima Barang?', 'Stok akan bertambah sesuai jumlah "Diterima". HPP akan diperbarui.', async () => {
            showLoading('Memproses Stok...');
            try {
                const payload = {
                    id: selectedPO.id,
                    items: cleanItems
                };
                await axios.post(API_URL + 'purchasing/receive', payload, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Barang diterima & Stok bertambah.');
                setSelectedPO(null);
                fetchPendingPO();
            } catch (error) { showAlert('error', 'Gagal', 'Terjadi kesalahan'); } finally { hideLoading(); }
        });
    };

    const isDecimalUnit = (unit) => ['kg', 'liter', 'gram', 'ml'].includes(unit);
    const getInputStep = (unit) => isDecimalUnit(unit) ? "0.001" : "1";

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl">Penerimaan Barang</h3>
                    <p className="text-gray-500 text-sm">Verifikasi PO masuk dan cek riwayat penerimaan.</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 w-fit mb-4">
                <button 
                    onClick={() => { setActiveTab('pending'); setSelectedPO(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Truck size={16}/> PO Pending
                </button>
                <button 
                    onClick={() => { setActiveTab('history'); setSelectedPO(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <History size={16}/> Riwayat Masuk
                </button>
            </div>

            {/* KONTEN TAB: PENDING PO */}
            {activeTab === 'pending' && (
                !selectedPO ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingPO.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                <Truck size={48} className="mx-auto mb-3 opacity-20"/>
                                <p>Tidak ada PO yang menunggu (Pending).</p>
                            </div>
                        ) : pendingPO.map(po => (
                            <div key={po.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group" onClick={() => handleSelectPO(po)}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-gray-800 group-hover:text-brand-primary transition-colors">{po.invoice_no}</h4>
                                        <p className="text-sm text-gray-500">{po.supplier_name}</p>
                                    </div>
                                    <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded-lg uppercase">Pending</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-400 gap-4 border-t border-gray-50 pt-3">
                                    <span className="flex items-center gap-1"><Calendar size={14}/> {po.purchase_date}</span>
                                    <span className="flex items-center gap-1 ml-auto font-bold text-gray-600 text-sm">Rp {parseInt(po.total_amount).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* DETAIL & VERIFIKASI PENERIMAAN */
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-right-4">
                        <div className="p-6 border-b border-gray-100 bg-brand-bg/30 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-gray-800">Verifikasi PO: {selectedPO.invoice_no}</h3>
                                <p className="text-sm text-gray-500">{selectedPO.supplier_name} • {selectedPO.purchase_date}</p>
                            </div>
                            <button onClick={() => setSelectedPO(null)} className="text-gray-400 hover:text-gray-600 font-medium text-sm">Kembali</button>
                        </div>

                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Barang</th>
                                            <th className="px-4 py-3">Dipesan</th>
                                            <th className="px-4 py-3 w-40">Diterima (Real)</th>
                                            <th className="px-4 py-3 w-48">Harga / Unit (Rp)</th>
                                            <th className="px-4 py-3 rounded-r-lg text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {poItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                                                <td className="px-4 py-3 text-gray-500">{parseFloat(item.qty)} {item.unit}</td>
                                                
                                                {/* Input Qty Diterima */}
                                                <td className="px-4 py-3">
                                                    <div className={`flex items-center border rounded-lg overflow-hidden bg-white ${parseFloat(item.received_qty) !== parseFloat(item.qty) ? 'border-orange-400 ring-1 ring-orange-200' : 'border-brand-primary'}`}>
                                                        <input 
                                                            type="number" 
                                                            step={getInputStep(item.unit)} 
                                                            className="w-full px-3 py-2 text-center font-bold text-brand-darkest outline-none"
                                                            value={item.received_qty}
                                                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                        />
                                                    </div>
                                                    {parseFloat(item.received_qty) !== parseFloat(item.qty) && (
                                                        <span className="text-[10px] text-orange-500 flex items-center gap-1 mt-1 font-medium"><AlertTriangle size={10}/> Beda jumlah</span>
                                                    )}
                                                </td>
                                                
                                                {/* Input Harga Beli (Bisa diedit jika harga berubah) */}
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="number" 
                                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-primary outline-none"
                                                        value={item.price_per_unit}
                                                        onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                    />
                                                </td>
                                                
                                                <td className="px-4 py-3 text-right font-bold text-gray-700">
                                                    Rp {(parseFloat(item.received_qty || 0) * parseFloat(item.price_per_unit || 0)).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-gray-100">
                                <button onClick={() => setSelectedPO(null)} className="px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-100 font-bold">Batal</button>
                                <button onClick={handleSubmitReceive} className="px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 font-bold shadow-lg shadow-green-200 flex items-center gap-2">
                                    <CheckCircle size={20} /> Konfirmasi & Masukkan Stok
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* KONTEN TAB: HISTORY PENERIMAAN */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><PackageCheck size={20}/> Log Barang Masuk</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Waktu</th>
                                    <th className="px-6 py-4">Barang</th>
                                    <th className="px-6 py-4 text-right">Jumlah Masuk</th>
                                    <th className="px-6 py-4">Referensi (PO)</th>
                                    <th className="px-6 py-4">Penerima</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {historyLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400">Belum ada riwayat barang masuk.</td>
                                    </tr>
                                ) : historyLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(log.created_at).toLocaleDateString('id-ID')} • {new Date(log.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{log.item_name}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">
                                            {/* Gunakan log.qty yang benar dari API */}
                                            +{parseFloat(log.qty)} {log.unit}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-blue-600 font-mono text-xs bg-blue-50 w-fit rounded px-2 py-1">{log.reference_id}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                                            <User size={14}/> {log.user_name}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <button 
                            onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                            disabled={historyPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        <span className="text-sm text-gray-500">Halaman {historyPage} dari {historyTotalPages}</span>
                        <button 
                            onClick={() => setHistoryPage(prev => Math.min(prev + 1, historyTotalPages))}
                            disabled={historyPage === historyTotalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}