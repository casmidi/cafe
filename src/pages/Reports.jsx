import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, Package, DollarSign, ArrowUpRight, ArrowDownRight, Filter, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Reports() {
    const [activeTab, setActiveTab] = useState('sales'); 
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); 
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); 
    
    // Data State
    const [salesData, setSalesData] = useState({ daily: [], top_products: [] });
    const [stockLogs, setStockLogs] = useState([]);
    const [profitData, setProfitData] = useState({ 
        revenue: 0, 
        cogs: 0, 
        gross_profit: 0, 
        expenses: { payroll: 0, operational: 0, total: 0 }, // Struktur data lengkap dari backend
        net_profit: 0,
        expense_purchasing: 0 
    });

    // Pagination State untuk Stock Logs
    const [stockPage, setStockPage] = useState(1);
    const [stockTotalPages, setStockTotalPages] = useState(1);

    const { showLoading, hideLoading } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        setStockPage(1); // Reset page saat tab/tanggal berubah
        fetchData();
    }, [activeTab, startDate, endDate]);

    useEffect(() => {
        if (activeTab === 'stock') fetchStockLogs();
    }, [stockPage]); 

    const fetchData = async () => {
        showLoading('Menganalisa data...');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const queryParams = `&start_date=${startDate}&end_date=${endDate}`;

            if (activeTab === 'sales') {
                const res = await axios.get(API_URL + 'reports/sales' + queryParams, config);
                if(res.data.status) setSalesData(res.data.data);
            } else if (activeTab === 'stock') {
                await fetchStockLogs(); 
            } else if (activeTab === 'profit') {
                const res = await axios.get(API_URL + 'reports/profit' + queryParams, config);
                if(res.data.status) setProfitData(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            hideLoading();
        }
    };

    const fetchStockLogs = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const queryParams = `&start_date=${startDate}&end_date=${endDate}&page=${stockPage}&limit=10`;
            const res = await axios.get(API_URL + 'reports/stock' + queryParams, config);
            if(res.data.status) {
                setStockLogs(res.data.data);
                setStockTotalPages(res.data.pagination.total_pages);
            }
        } catch(error) { console.error(error); }
    };

    const SalesView = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="font-bold text-gray-800 mb-6">Grafik Omzet Harian</h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData.daily}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#D92929" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#D92929" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => new Date(val).getDate()} />
                            <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                            <Tooltip formatter={(val) => `Rp ${val.toLocaleString()}`} />
                            <Area type="monotone" dataKey="total" stroke="#D92929" fillOpacity={1} fill="url(#colorTotal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="font-bold text-gray-800 mb-4">5 Menu Terlaris</h4>
                <div className="space-y-4">
                    {salesData.top_products.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-brand-primary w-6 text-center">#{idx + 1}</span>
                                <span className="font-medium text-gray-700">{item.name}</span>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-800">{item.qty_sold} terjual</p>
                                <p className="text-xs text-gray-500">Omzet: Rp {parseInt(item.revenue).toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const ProfitView = () => {
        // Fallback agar tidak crash jika data expenses belum ready
        const expenses = profitData.expenses || { payroll: 0, operational: 0, total: 0 };
        
        return (
            <div className="space-y-6">
                {/* Kartu Utama */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                        <p className="text-blue-600 font-bold mb-1 flex items-center gap-2"><ArrowUpRight size={18}/> Pendapatan (Revenue)</p>
                        <h3 className="text-3xl font-extrabold text-blue-900 mt-2">Rp {parseInt(profitData.revenue).toLocaleString('id-ID')}</h3>
                        <p className="text-xs text-blue-500 mt-2">Total penjualan kotor dari transaksi</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
                        <p className="text-orange-600 font-bold mb-1 flex items-center gap-2"><ArrowDownRight size={18}/> Beban Pokok (HPP)</p>
                        <h3 className="text-3xl font-extrabold text-orange-900 mt-2">Rp {parseInt(profitData.cogs).toLocaleString('id-ID')}</h3>
                        <p className="text-xs text-orange-500 mt-2">Modal bahan baku (Resep)</p>
                    </div>

                    <div className={`p-6 rounded-2xl border ${profitData.net_profit >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className={`${profitData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'} font-bold mb-1 flex items-center gap-2`}>
                            <DollarSign size={18}/> Laba Bersih (Net Profit)
                        </p>
                        <h3 className={`text-3xl font-extrabold mt-2 ${profitData.net_profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                            Rp {parseInt(profitData.net_profit).toLocaleString('id-ID')}
                        </h3>
                        <p className="text-xs opacity-70 mt-2">Setelah dikurangi semua beban</p>
                    </div>
                </div>

                {/* Detail Breakdown Biaya */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Kiri: Struktur Laba Rugi */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <TrendingUp size={18} className="text-gray-500" /> Analisa Laba Rugi
                        </h4>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-600">Pendapatan Kotor</span>
                                <span className="font-bold text-gray-800">Rp {parseInt(profitData.revenue).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-600">(-) HPP (Modal Bahan)</span>
                                <span className="font-medium text-red-500">- Rp {parseInt(profitData.cogs).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-gray-50 px-3 rounded-lg">
                                <span className="font-bold text-gray-700">Laba Kotor (Gross Profit)</span>
                                <span className="font-bold text-brand-darkest">Rp {parseInt(profitData.gross_profit).toLocaleString()}</span>
                            </div>
                            
                            {/* Breakdown Expenses */}
                            <div className="pl-4 space-y-2 border-l-2 border-gray-100 mt-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">(-) Biaya Gaji (Payroll)</span>
                                    <span className="text-red-400">- Rp {parseInt(expenses.payroll).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">(-) Biaya Operasional (Listrik/Sewa/dll)</span>
                                    <span className="text-red-400">- Rp {parseInt(expenses.operational).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-4 border-t-2 border-gray-100 mt-4">
                                <span className="font-extrabold text-lg text-brand-darkest">LABA BERSIH</span>
                                <span className={`font-extrabold text-lg ${profitData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Rp {parseInt(profitData.net_profit).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Kanan: Cashflow Tambahan */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Wallet size={18} className="text-gray-500" /> Informasi Cashflow Lainnya
                        </h4>
                        
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-4">
                            <p className="text-sm text-yellow-700 font-bold mb-1">Pembelian Stok (Purchasing)</p>
                            <h3 className="text-2xl font-bold text-yellow-800">Rp {parseInt(profitData.cash_outflow_purchasing).toLocaleString('id-ID')}</h3>
                            <p className="text-xs text-yellow-600 mt-2 leading-relaxed">
                                Uang tunai yang keluar untuk belanja ke supplier. Angka ini mempengaruhi saldo kas, tetapi secara akuntansi dicatat sebagai HPP saat barang terjual.
                            </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-sm font-bold text-gray-600 mb-2">Tips Keuangan:</p>
                            <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                                <li>Pastikan <b>Laba Kotor</b> minimal 40-50% dari Pendapatan untuk menutupi biaya operasional.</li>
                                <li>Jika <b>HPP</b> terlalu tinggi, periksa harga beli bahan baku atau kurangi porsi.</li>
                                <li>Biaya Operasional idealnya tidak lebih dari 20% omzet.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const StockView = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h4 className="font-bold text-gray-800">Riwayat Mutasi Stok</h4>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Waktu</th>
                            <th className="px-6 py-4">Item</th>
                            <th className="px-6 py-4">Tipe</th>
                            <th className="px-6 py-4 text-right">Jumlah</th>
                            <th className="px-6 py-4">Ref</th>
                            <th className="px-6 py-4">User</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {stockLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 text-gray-500">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                                <td className="px-6 py-4 font-medium text-gray-800">{log.item_name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.type === 'in' ? 'bg-green-100 text-green-600' : (log.type === 'sale' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600')}`}>
                                        {log.type === 'in' ? 'Masuk' : (log.type === 'sale' ? 'Terjual' : 'Keluar')}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${log.qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {parseFloat(log.qty) > 0 ? '+' : ''}{parseFloat(log.qty)} {log.unit}
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs">{log.reference_id}</td>
                                <td className="px-6 py-4 text-gray-500">{log.user_name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <button 
                        onClick={() => setStockPage(prev => Math.max(prev - 1, 1))}
                        disabled={stockPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} /> Prev
                    </button>
                    <span className="text-sm text-gray-500">Halaman {stockPage} dari {stockTotalPages}</span>
                    <button 
                        onClick={() => setStockPage(prev => Math.min(prev + 1, stockTotalPages))}
                        disabled={stockPage === stockTotalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl">Laporan Bisnis</h3>
                    <p className="text-gray-500 text-sm">Analisa performa penjualan dan stok.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <Calendar size={18} className="text-gray-400 ml-2" />
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none text-gray-600 font-medium" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none text-gray-600 font-medium" />
                </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
                <button onClick={() => setActiveTab('sales')} className={`px-6 py-2 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'sales' ? 'bg-white text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                    Penjualan
                </button>
                <button onClick={() => setActiveTab('stock')} className={`px-6 py-2 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'stock' ? 'bg-white text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                    Mutasi Stok
                </button>
                <button onClick={() => setActiveTab('profit')} className={`px-6 py-2 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'profit' ? 'bg-white text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                    Laba Rugi
                </button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'sales' && <SalesView />}
                {activeTab === 'stock' && <StockView />}
                {activeTab === 'profit' && <ProfitView />}
            </div>
        </div>
    );
}