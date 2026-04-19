import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Calendar, Search, Printer, Eye, FileText, ChevronLeft, ChevronRight, CreditCard, Banknote, X, AlertTriangle, Trash2, Loader2, Scissors, ArrowRightLeft, Plus, Minus, CheckCircle, Star, Bluetooth } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import Receipt from '../components/Receipt';
import { API_URL } from '../config';
import { BluetoothPrinter } from '../utils/bluetoothPrinter'; // Import Helper Bluetooth

export default function Orders() {
    const [transactions, setTransactions] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [settings, setSettings] = useState(null);

    const [selectedTrx, setSelectedTrx] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const componentRef = useRef();
    
    // State untuk Void Reason
    const [showVoidConfirm, setShowVoidConfirm] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [isVoidLoading, setIsVoidLoading] = useState(false);

    // STATE UNTUK SPLIT BILL
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitItems, setSplitItems] = useState({}); // Format: { item_id: qty_to_split }
    const [isSplitLoading, setIsSplitLoading] = useState(false);

    // STATE UNTUK PAY PENDING
    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [isPayLoading, setIsPayLoading] = useState(false);

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        setCurrentPage(1); 
    }, [selectedDate, searchQuery]);

    useEffect(() => {
        fetchOrders();
        fetchSettings(); 
    }, [selectedDate, currentPage, searchQuery]);

    const fetchSettings = async () => {
        const localSettings = localStorage.getItem('outletSettings');
        if (localSettings) {
            setSettings(JSON.parse(localSettings));
        }
        
        try {
            const res = await axios.get(API_URL + 'settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setSettings(res.data.data);
                localStorage.setItem('outletSettings', JSON.stringify(res.data.data));
            }
        } catch (error) {
            console.error("Gagal load settings", error);
        }
    };

    const fetchOrders = async () => {
        showLoading('Memuat data transaksi...');
        try {
            const res = await axios.get(`${API_URL}pos/history&date=${selectedDate}&page=${currentPage}&limit=10&search=${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setTransactions(res.data.data);
                setTotalPages(res.data.pagination.total_pages);
                setTotalItems(res.data.pagination.total_items);
            }
        } catch (error) {
            console.error(error);
            showAlert('error', 'Gagal', 'Gagal memuat riwayat pesanan.');
        } finally {
            hideLoading();
        }
    };

    const handleViewDetail = async (invoice) => {
        showLoading('Mengambil detail...');
        try {
            const res = await axios.get(API_URL + 'pos/detail&invoice=' + invoice, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                const data = res.data.data;
                
                const parsedItems = data.items.map(item => ({
                    ...item,
                    modifiers_name: item.modifiers_name ? JSON.parse(item.modifiers_name) : []
                }));
                
                const pointValue = settings?.point_value_idr || 500;
                const redeemVal = (data.points_redeemed || 0) * pointValue;

                const receiptFormat = {
                    id: data.id, 
                    invoice_no: data.invoice_no,
                    cashier_name: data.cashier_name,
                    items: parsedItems,
                    
                    sub_total: data.total_amount,      
                    total_amount: data.final_amount,   
                    discount_amount: data.discount_amount,
                    tax: data.tax_amount,
                    service_charge: data.service_charge,
                    
                    points_earned: data.points_earned,
                    points_redeemed: data.points_redeemed,
                    redeem_value: redeemVal, 
                    
                    payment_method: data.payment_method,
                    payment_status: data.payment_status, 
                    cash_received: null, 
                    change: 0,
                    date: new Date(data.created_at).toLocaleString('id-ID'),
                    table_name: data.table_number ? `Meja ${data.table_number}` : 'Take Away',
                    outlet_info: settings 
                };
                
                setSelectedTrx(receiptFormat);
                setShowDetailModal(true);
            }
        } catch (error) {
            showAlert('error', 'Gagal', 'Detail tidak ditemukan');
        } finally {
            hideLoading();
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // --- FUNGSI PRINT BLUETOOTH ---
    const handleBluetoothPrint = async () => {
        if (!selectedTrx) return;
        
        try {
            // Cek koneksi dulu
            if (!BluetoothPrinter.isConnected()) {
                await BluetoothPrinter.connect();
            }
            
            await BluetoothPrinter.printReceipt(selectedTrx);
            showAlert('success', 'Terkirim', 'Struk dikirim ke printer.');
        } catch (error) {
            showAlert('error', 'Print Gagal', error.message);
        }
    };
    
    const handleVoid = () => {
        if(!voidReason) return showAlert('error', 'Gagal', 'Alasan pembatalan wajib diisi.');
        
        setIsVoidLoading(true);
        axios.post(API_URL + 'pos/void', {
            id: selectedTrx.id,
            reason: voidReason
        }, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
            showAlert('success', 'Berhasil', 'Transaksi dibatalkan (VOID).');
            setShowVoidConfirm(false);
            setShowDetailModal(false);
            setVoidReason('');
            fetchOrders();
        })
        .catch(err => {
            showAlert('error', 'Gagal', err.response?.data?.message || 'Gagal void transaksi.');
        })
        .finally(() => setIsVoidLoading(false));
    };

    // --- LOGIKA SPLIT BILL ---
    const openSplitModal = () => {
        const initialSplit = {};
        selectedTrx.items.forEach(item => {
            initialSplit[item.id] = 0; 
        });
        setSplitItems(initialSplit);
        setShowSplitModal(true);
    };

    const updateSplitQty = (itemId, delta, maxQty) => {
        setSplitItems(prev => {
            const currentQty = prev[itemId] || 0;
            const newQty = Math.max(0, Math.min(currentQty + delta, maxQty));
            return { ...prev, [itemId]: newQty };
        });
    };

    const handleSplitSubmit = async () => {
        const itemsToSplit = Object.keys(splitItems)
            .map(key => ({ id: key, qty: splitItems[key] }))
            .filter(item => item.qty > 0);

        if (itemsToSplit.length === 0) {
            return showAlert('error', 'Pilih Item', 'Pilih minimal satu item untuk dipisahkan.');
        }

        const totalOriginalQty = selectedTrx.items.reduce((acc, item) => acc + parseInt(item.qty), 0);
        const totalSplitQty = itemsToSplit.reduce((acc, item) => acc + item.qty, 0);

        if (totalSplitQty === totalOriginalQty) {
            return showAlert('error', 'Tidak Bisa Split Semua', 'Jika ingin memindahkan semua item, gunakan fitur Edit/Void.');
        }

        setIsSplitLoading(true);
        try {
            const res = await axios.post(API_URL + 'pos/split', {
                original_transaction_id: selectedTrx.id,
                items_to_split: itemsToSplit
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                showAlert('success', 'Split Berhasil', `Transaksi baru dibuat: ${res.data.new_invoice}`);
                setShowSplitModal(false);
                setShowDetailModal(false);
                fetchOrders(); 
            } else {
                throw new Error(res.data.message);
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Gagal melakukan split bill';
            showAlert('error', 'Gagal', msg);
        } finally {
            setIsSplitLoading(false);
        }
    };

    // --- LOGIKA PAY PENDING ---
    const openPayModal = () => {
        setPayMethod('cash');
        setCashReceived('');
        setShowPayModal(true);
    };

    const handlePayPending = async () => {
        if (payMethod === 'cash') {
             const amount = parseFloat(cashReceived) || 0;
             if (amount < parseFloat(selectedTrx.total_amount)) {
                  return showAlert('error', 'Uang Kurang', 'Nominal pembayaran kurang.');
             }
        }

        setIsPayLoading(true);
        try {
            const res = await axios.post(API_URL + 'pos/pay-pending', {
                id: selectedTrx.id,
                payment_method: payMethod
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                showAlert('success', 'Pembayaran Berhasil', 'Status transaksi diperbarui.');
                setShowPayModal(false);
                
                const updatedTrx = {
                    ...selectedTrx,
                    payment_status: 'paid',
                    payment_method: payMethod,
                    cash_received: payMethod === 'cash' ? cashReceived : null,
                    change: payMethod === 'cash' ? (parseFloat(cashReceived) - parseFloat(selectedTrx.total_amount)) : 0
                };
                setSelectedTrx(updatedTrx);
                fetchOrders(); 
            } else {
                throw new Error(res.data.message);
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Gagal memproses pembayaran';
            showAlert('error', 'Gagal', msg);
        } finally {
            setIsPayLoading(false);
        }
    };

    const calculateSplitTotal = () => {
        if (!selectedTrx) return 0;
        let total = 0;
        selectedTrx.items.forEach(item => {
            const qty = splitItems[item.id] || 0;
            total += qty * parseFloat(item.price);
        });
        return total;
    };

    const pageRevenue = transactions.reduce((sum, trx) => {
        return trx.payment_status === 'paid' ? sum + parseFloat(trx.final_amount) : sum;
    }, 0);

    const getStatusBadge = (status) => {
        switch(status) {
            case 'paid': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'void': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const quickCashAmounts = [10000, 20000, 50000, 100000];
    const changeAmount = (parseFloat(cashReceived) || 0) - (parseFloat(selectedTrx?.total_amount) || 0);
    const isSufficient = payMethod === 'cash' ? changeAmount >= 0 : true;

    return (
        <div className="space-y-6">
            <div id="printable-receipt">
                <Receipt data={selectedTrx} ref={componentRef} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl">Riwayat Pesanan</h3>
                    <p className="text-gray-500 text-sm">Daftar transaksi yang tercatat di sistem.</p>
                </div>
                <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                    <Calendar size={18} className="text-brand-primary mr-2" />
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="outline-none text-gray-600 font-medium bg-transparent"
                    />
                </div>
            </div>

            <div className="bg-brand-primary text-white rounded-2xl p-6 shadow-lg shadow-brand-primary/30 flex justify-between items-center">
                <div>
                    <p className="text-brand-accent text-sm font-medium mb-1">Total Bersih (Paid)</p>
                    <h2 className="text-3xl font-bold">Rp {pageRevenue.toLocaleString('id-ID')}</h2>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                    <FileText size={32} className="text-white" />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Cari No Invoice..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-accent outline-none"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-gray-500">Total: <b>{totalItems}</b> transaksi</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 bg-gray-50/50 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Invoice</th>
                                <th className="px-6 py-4">Waktu</th>
                                <th className="px-6 py-4">Pelanggan</th>
                                <th className="px-6 py-4">Metode</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactions.length > 0 ? transactions.map((trx) => (
                                <tr key={trx.id} className={`hover:bg-gray-50/50 transition-colors ${trx.payment_status === 'void' ? 'opacity-50 bg-gray-50' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-brand-darkest">{trx.invoice_no}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(trx.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-gray-800 font-bold">{trx.customer_name || trx.notes || 'Guest'}</p>
                                        {trx.table_number && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Meja {trx.table_number}</span>}
                                    </td>
                                    <td className="px-6 py-4 capitalize">
                                        <div className="flex items-center gap-2">
                                            {trx.payment_method === 'cash' ? <Banknote size={14} className="text-green-600"/> : <CreditCard size={14} className="text-blue-600"/>}
                                            <span className="text-gray-700 font-medium">{trx.payment_method?.replace('_', ' ') || 'Online/QR'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusBadge(trx.payment_status)} uppercase`}>
                                            {trx.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-800">
                                        {trx.payment_status === 'void' ? <span className="line-through text-red-300">Rp {parseInt(trx.final_amount).toLocaleString('id-ID')}</span> : `Rp ${parseInt(trx.final_amount).toLocaleString('id-ID')}`}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleViewDetail(trx.invoice_no)}
                                            className="p-2 text-gray-400 hover:text-brand-primary transition-colors bg-gray-50 hover:bg-brand-bg rounded-lg"
                                            title="Lihat Detail & Cetak"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                                        Tidak ada transaksi pada tanggal/pencarian ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        <span className="text-sm text-gray-500">Halaman {currentPage} dari {totalPages}</span>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL DETAIL PESANAN */}
            {showDetailModal && selectedTrx && (
                <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative max-h-[90vh] flex flex-col">
                        
                        {/* OVERLAY VOID & SPLIT */}
                        {showVoidConfirm && (
                            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
                                <div className="bg-red-50 p-4 rounded-full mb-4">
                                    <AlertTriangle size={32} className="text-red-500"/>
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">Batalkan Transaksi?</h4>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    Tindakan ini <b>tidak bisa dibatalkan</b>. Stok produk akan dikembalikan ke inventory secara otomatis.
                                </p>
                                
                                <div className="w-full mb-6 text-left">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Alasan Pembatalan</label>
                                    <input 
                                        type="text" 
                                        placeholder="Contoh: Salah input, Pelanggan cancel..." 
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                                        value={voidReason}
                                        onChange={e => setVoidReason(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                
                                <div className="flex gap-3 w-full">
                                    <button 
                                        onClick={() => setShowVoidConfirm(false)} 
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={handleVoid} 
                                        disabled={isVoidLoading}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {isVoidLoading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                        {isVoidLoading ? 'Memproses...' : 'Ya, Void'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {showSplitModal && (
                            <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in fade-in duration-200">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2"><Scissors size={18} /> Split Bill</h4>
                                    <button onClick={() => setShowSplitModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <p className="text-sm text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        Pilih item yang akan dipindahkan ke <b>transaksi baru</b>. Transaksi ini akan dikurangi.
                                    </p>
                                    <div className="space-y-3">
                                        {selectedTrx.items.map(item => (
                                            <div key={item.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-white">
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-800">{item.name}</p>
                                                    <p className="text-xs text-gray-500">Tersedia: {item.qty}</p>
                                                </div>
                                                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                                    <button onClick={() => updateSplitQty(item.id, -1, parseInt(item.qty))} disabled={!splitItems[item.id]} className="w-7 h-7 bg-white border rounded-md flex items-center justify-center text-gray-600 disabled:opacity-50"><Minus size={12}/></button>
                                                    <span className="font-bold text-sm w-4 text-center text-brand-primary">{splitItems[item.id] || 0}</span>
                                                    <button onClick={() => updateSplitQty(item.id, 1, parseInt(item.qty))} disabled={splitItems[item.id] >= parseInt(item.qty)} className="w-7 h-7 bg-white border rounded-md flex items-center justify-center text-gray-600 disabled:opacity-50"><Plus size={12}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 border-t border-gray-100 bg-gray-50">
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowSplitModal(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">Batal</button>
                                        <button onClick={handleSplitSubmit} disabled={isSplitLoading} className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                                            {isSplitLoading ? <Loader2 className="animate-spin" size={18}/> : <ArrowRightLeft size={18}/>} Proses Split
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showPayModal && (
                            <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in fade-in duration-200">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2"><CreditCard size={18} /> Pembayaran</h4>
                                    <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                                </div>
                                <div className="p-6 flex-1 overflow-y-auto">
                                    <div className="bg-brand-primary text-white p-5 rounded-2xl text-center mb-6 shadow-lg shadow-brand-primary/20">
                                        <p className="text-sm text-brand-accent font-medium mb-1">Total Tagihan</p>
                                        <h2 className="text-3xl font-bold">Rp {parseInt(selectedTrx.total_amount).toLocaleString('id-ID')}</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setPayMethod('cash')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold transition-all ${payMethod === 'cash' ? 'border-brand-primary bg-brand-bg text-brand-primary ring-1 ring-brand-primary' : 'border-gray-200 text-gray-500'}`}><Banknote size={20} /> <span className="text-xs">Tunai</span></button>
                                        <button onClick={() => setPayMethod('qris')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold transition-all ${payMethod === 'qris' ? 'border-brand-primary bg-brand-bg text-brand-primary ring-1 ring-brand-primary' : 'border-gray-200 text-gray-500'}`}><CreditCard size={20} /> <span className="text-xs">QRIS</span></button>
                                    </div>
                                    {payMethod === 'cash' && (
                                        <div className="mt-4">
                                            <div className="relative mb-3"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rp</span><input type="number" autoFocus className="w-full pl-12 pr-4 py-3 text-lg font-bold border rounded-xl outline-none focus:ring-2 focus:ring-green-500" placeholder="0" value={cashReceived} onChange={e => setCashReceived(e.target.value)} /></div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 border-t border-gray-100 bg-gray-50">
                                    <button onClick={handlePayPending} disabled={isPayLoading} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                                        {isPayLoading ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle size={20} />} Bayar Sekarang
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Detail Pesanan</h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-xs text-gray-500">Invoice</p>
                                    <p className="font-bold text-brand-darkest">{selectedTrx.invoice_no}</p>
                                    <p className="text-xs font-medium text-gray-600 mt-1">{selectedTrx.table_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Waktu</p>
                                    <p className="font-bold text-gray-800">{selectedTrx.date}</p>
                                    <p className={`text-xs font-bold mt-1 uppercase px-2 py-0.5 rounded ${selectedTrx.payment_status === 'paid' ? 'bg-green-100 text-green-600' : (selectedTrx.payment_status === 'void' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600')}`}>
                                        {selectedTrx.payment_status === 'pending' ? 'Belum Lunas' : selectedTrx.payment_status}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 border border-gray-100">
                                {selectedTrx.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-sm">
                                        <div className="flex-1">
                                            <span className="text-gray-600"><span className="font-bold">{item.qty}x</span> {item.name}</span>
                                            <div className="text-[10px] text-gray-500 pl-5">
                                                {item.variant_name && <span className="block">+ {item.variant_name}</span>}
                                                {item.modifiers_name && item.modifiers_name.map((mod, i) => (
                                                    <span key={i} className="block">+ {mod}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <span className="font-medium">Rp {(item.qty * item.price).toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2 pt-4 border-t border-dashed border-gray-300 mb-6 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>Rp {parseInt(selectedTrx.sub_total).toLocaleString('id-ID')}</span>
                                </div>
                                
                                {parseInt(selectedTrx.discount_amount) > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Diskon</span>
                                        <span>- Rp {parseInt(selectedTrx.discount_amount).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                
                                {parseInt(selectedTrx.points_redeemed) > 0 && (
                                    <div className="flex justify-between text-purple-600">
                                        <span className="flex items-center gap-1"><Star size={12} /> Poin ({selectedTrx.points_redeemed})</span>
                                        <span>- Rp {parseInt(selectedTrx.redeem_value).toLocaleString('id-ID')}</span>
                                    </div>
                                )}

                                {parseInt(selectedTrx.service_charge) > 0 && (
                                    <div className="flex justify-between">
                                        <span>Service Charge</span>
                                        <span>Rp {parseInt(selectedTrx.service_charge).toLocaleString('id-ID')}</span>
                                    </div>
                                )}

                                {parseInt(selectedTrx.tax) > 0 && (
                                    <div className="flex justify-between">
                                        <span>Pajak</span>
                                        <span>Rp {parseInt(selectedTrx.tax).toLocaleString('id-ID')}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                    <span className="font-bold text-lg text-gray-800">Total</span>
                                    <span className="font-bold text-xl text-brand-primary">Rp {parseInt(selectedTrx.total_amount).toLocaleString('id-ID')}</span>
                                </div>
                                
                                {parseInt(selectedTrx.points_earned) > 0 && (
                                    <div className="flex justify-end text-xs text-yellow-600 font-bold mt-1">
                                        <span className="flex items-center gap-1"><Star size={12} className="fill-yellow-500 text-yellow-500"/> +{selectedTrx.points_earned} Poin Didapat</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <button onClick={handlePrint} className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                                        <Printer size={20} /> Browser
                                    </button>
                                    <button onClick={handleBluetoothPrint} className="flex-1 py-3 bg-brand-darkest text-white font-bold rounded-xl hover:bg-brand-dark flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                                        <Bluetooth size={20} /> Bluetooth
                                    </button>
                                </div>
                                
                                {selectedTrx.payment_status !== 'void' && (
                                    <>
                                        {selectedTrx.payment_status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button onClick={openPayModal} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 flex items-center justify-center gap-2 shadow-lg transition-colors" title="Bayar Sekarang">
                                                    <CheckCircle size={20} /> Bayar
                                                </button>
                                                <button onClick={openSplitModal} className="flex-1 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-100 transition-colors" title="Split Bill">
                                                    <Scissors size={20} /> Split
                                                </button>
                                            </div>
                                        )}
                                        <button onClick={() => setShowVoidConfirm(true)} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 flex items-center justify-center gap-2 border border-red-100 transition-colors" title="Batalkan Transaksi">
                                            <Trash2 size={20} /> Batalkan (Void)
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}