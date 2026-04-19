import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Search, Save, AlertTriangle, CheckCircle, RefreshCcw, ClipboardCheck, ChevronLeft, ChevronRight, History, FileText, User } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function StockOpname() {
    const [activeTab, setActiveTab] = useState('form'); // 'form' or 'history'
    
    // --- STATE FORM OPNAME ---
    const [ingredients, setIngredients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [opnameValues, setOpnameValues] = useState({});
    const [opnameNotes, setOpnameNotes] = useState({});

    // --- STATE HISTORY ---
    const [historyLogs, setHistoryLogs] = useState([]);
    const [histPage, setHistPage] = useState(1);
    const [histTotalPages, setHistTotalPages] = useState(1);

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');

    // Fetch data based on active tab
    useEffect(() => {
        if (activeTab === 'form') fetchIngredients();
        else fetchHistory();
    }, [activeTab, currentPage, histPage, searchQuery]);

    const fetchIngredients = async () => {
        showLoading('Memuat stok...');
        try {
            const res = await axios.get(`${API_URL}inventory/ingredients&page=${currentPage}&limit=10&search=${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setIngredients(res.data.data);
                setTotalPages(res.data.pagination.total_pages);
            }
        } catch (error) { console.error(error); } finally { hideLoading(); }
    };

    const fetchHistory = async () => {
        showLoading('Memuat riwayat...');
        try {
            const res = await axios.get(`${API_URL}inventory/opname-history&page=${histPage}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setHistoryLogs(res.data.data);
                setHistTotalPages(res.data.pagination.total_pages);
            }
        } catch (error) { console.error(error); } finally { hideLoading(); }
    };

    const handleInputChange = (id, value) => {
        setOpnameValues(prev => ({ ...prev, [id]: value }));
    };

    const handleNoteChange = (id, value) => {
        setOpnameNotes(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveOpname = (item) => {
        const actual = opnameValues[item.id];
        if (actual === undefined || actual === '') return;
        
        const systemStock = parseFloat(item.current_stock);
        const actualStock = parseFloat(actual);
        const diff = actualStock - systemStock;
        
        if (diff === 0) return showAlert('success', 'Sesuai', 'Stok fisik sama dengan sistem.');

        const confirmMsg = `
            Bahan: ${item.name}
            Sistem: ${systemStock} ${item.unit}
            Fisik: ${actualStock} ${item.unit}
            -------------------------
            Selisih: ${diff > 0 ? '+' : ''}${diff} ${item.unit}
            
            Yakin ingin menyesuaikan stok?
        `;

        showConfirm('Konfirmasi Opname', confirmMsg, async () => {
            showLoading('Menyesuaikan Stok...');
            try {
                await axios.post(API_URL + 'inventory/opname', {
                    id: item.id,
                    actual_stock: actualStock,
                    note: opnameNotes[item.id] || 'Stok Opname Rutin'
                }, { headers: { Authorization: `Bearer ${token}` } });

                showAlert('success', 'Berhasil', 'Stok berhasil disesuaikan.');
                setOpnameValues(prev => { const next = { ...prev }; delete next[item.id]; return next; });
                fetchIngredients(); 
            } catch (error) { showAlert('error', 'Gagal', 'Gagal update stok.'); } finally { hideLoading(); }
        });
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl flex items-center gap-2">
                        <ClipboardCheck size={28}/> Stok Opname
                    </h3>
                    <p className="text-gray-500 text-sm">Sesuaikan stok sistem dengan fisik gudang.</p>
                </div>
                
                {/* TAB NAVIGATION */}
                <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                    <button 
                        onClick={() => setActiveTab('form')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'form' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <FileText size={16}/> Form Opname
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <History size={16}/> Riwayat Opname
                    </button>
                </div>
            </div>

            {/* KONTEN: FORM OPNAME */}
            {activeTab === 'form' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Cari bahan..." 
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-accent outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button onClick={fetchIngredients} className="p-2 text-gray-500 hover:text-brand-primary bg-white border border-gray-200 rounded-lg shadow-sm">
                            <RefreshCcw size={18}/>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Nama Bahan</th>
                                    <th className="px-6 py-4 text-center w-32">Satuan</th>
                                    <th className="px-6 py-4 text-right w-40">Stok Sistem</th>
                                    <th className="px-6 py-4 w-40">Stok Fisik</th>
                                    <th className="px-6 py-4 w-40 text-center">Selisih</th>
                                    <th className="px-6 py-4">Catatan</th>
                                    <th className="px-6 py-4 text-center w-20">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {ingredients.map((item) => {
                                    const actual = opnameValues[item.id];
                                    const system = parseFloat(item.current_stock);
                                    const diff = actual !== undefined && actual !== '' ? parseFloat(actual) - system : 0;
                                    const isModified = actual !== undefined && actual !== '';

                                    return (
                                        <tr key={item.id} className={`transition-colors ${isModified ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                                            <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                                            <td className="px-6 py-4 text-center text-gray-500 bg-gray-50 font-mono text-xs">{item.unit}</td>
                                            <td className="px-6 py-4 text-right font-medium text-gray-600 bg-gray-50/50">{parseFloat(item.current_stock).toLocaleString('id-ID')}</td>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="number" step="0.01"
                                                    className={`w-full border rounded-lg px-3 py-2 font-bold text-center outline-none focus:ring-2 ${isModified ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-gray-300'}`}
                                                    placeholder={system}
                                                    value={actual || ''}
                                                    onChange={(e) => handleInputChange(item.id, e.target.value)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isModified && diff !== 0 ? (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${diff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {diff > 0 ? '+' : ''}{parseFloat(diff.toFixed(2))}
                                                    </span>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="text" 
                                                    className="w-full border-b border-gray-200 bg-transparent text-xs py-1 outline-none focus:border-brand-primary"
                                                    placeholder="Ket. (opsional)"
                                                    value={opnameNotes[item.id] || ''}
                                                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleSaveOpname(item)}
                                                    disabled={!isModified || diff === 0}
                                                    className={`p-2 rounded-lg transition-all shadow-sm ${!isModified || diff === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-dark active:scale-95'}`}
                                                >
                                                    <Save size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={16} /> Prev</button>
                            <span className="text-sm text-gray-500">Hal {currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next <ChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* KONTEN: RIWAYAT OPNAME */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50"><h4 className="font-bold text-gray-800 flex items-center gap-2"><History size={20}/> Log Penyesuaian Stok</h4></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Waktu</th>
                                    <th className="px-6 py-4">Bahan</th>
                                    <th className="px-6 py-4 text-right">Sebelum</th>
                                    <th className="px-6 py-4 text-right">Sesudah (Fisik)</th>
                                    <th className="px-6 py-4 text-center">Selisih</th>
                                    <th className="px-6 py-4">Catatan</th>
                                    <th className="px-6 py-4">Petugas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {historyLogs.length === 0 ? (
                                    <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-400">Belum ada riwayat opname.</td></tr>
                                ) : historyLogs.map((log) => {
                                    const diff = parseFloat(log.balance_after) - parseFloat(log.balance_before);
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500">
                                                {new Date(log.created_at).toLocaleDateString('id-ID')} • {new Date(log.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{log.ingredient_name}</td>
                                            <td className="px-6 py-4 text-right text-gray-500">{parseFloat(log.balance_before)} {log.unit}</td>
                                            <td className="px-6 py-4 text-right font-bold text-brand-darkest">{parseFloat(log.balance_after)} {log.unit}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${diff > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {diff > 0 ? '+' : ''}{diff}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 italic">{log.note || '-'}</td>
                                            <td className="px-6 py-4 text-gray-500 flex items-center gap-2"><User size={14}/> {log.user_name || 'System'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <button onClick={() => setHistPage(prev => Math.max(prev - 1, 1))} disabled={histPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={16} /> Prev</button>
                        <span className="text-sm text-gray-500">Hal {histPage} / {histTotalPages}</span>
                        <button onClick={() => setHistPage(prev => Math.min(prev + 1, histTotalPages))} disabled={histPage === histTotalPages} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next <ChevronRight size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}