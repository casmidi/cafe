import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Clock, CheckCircle, XCircle, MoreHorizontal, ArrowUpRight, Calendar, DollarSign, TrendingUp, Filter } from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { motion } from 'framer-motion';
import { API_URL } from '../config'; // Config URL Terpusat

export default function Dashboard() {
    // --- STATE ---
    const [isLoading, setIsLoading] = useState(true);
    
    // 1. Statistik Hari Ini (Cards)
    const [todayStats, setTodayStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        avgTransaction: 0,
        totalDiscount: 0
    });

    // 2. Grafik Tren (Chart)
    const [revenueTrend, setRevenueTrend] = useState([]);

    // 3. Produk Terlaris (Top Products)
    const [topProducts, setTopProducts] = useState([]);

    // 4. Pesanan Terbaru (Recent Table)
    const [recentOrders, setRecentOrders] = useState([]);

    const token = localStorage.getItem('token');

    // --- FETCH DATA ---
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const today = new Date();
            const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Hitung tanggal 7 hari lalu untuk grafik
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 6);
            const lastWeekString = lastWeek.toISOString().split('T')[0];

            // REQUEST PARALEL
            const [resToday, resReport] = await Promise.all([
                // 1. Ambil data transaksi HARI INI (untuk Cards & Recent Orders)
                axios.get(`${API_URL}pos/history&date=${dateString}`, config),
                
                // 2. Ambil laporan MINGGUAN (untuk Grafik & Top Products)
                axios.get(`${API_URL}reports/sales&start_date=${lastWeekString}&end_date=${dateString}`, config)
            ]);

            // --- OLAH DATA HARI INI ---
            if (resToday.data.status) {
                const transactions = resToday.data.data;
                
                // Hitung Total
                const totalOrders = transactions.length;
                const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.final_amount), 0);
                const totalDiscount = transactions.reduce((sum, t) => sum + parseFloat(t.discount_amount), 0);
                const avgTransaction = totalOrders > 0 ? totalRevenue / totalOrders : 0;

                setTodayStats({ totalOrders, totalRevenue, avgTransaction, totalDiscount });
                setRecentOrders(transactions.slice(0, 5)); // Ambil 5 terbaru
            }

            // --- OLAH DATA LAPORAN ---
            if (resReport.data.status) {
                const reportData = resReport.data.data;
                
                // Format data untuk Grafik Area Recharts
                // Kita pastikan format tanggalnya mudah dibaca (contoh: "24 Nov")
                const formattedTrend = reportData.daily.map(item => ({
                    date: new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                    total: parseInt(item.total)
                }));
                setRevenueTrend(formattedTrend);

                setTopProducts(reportData.top_products);
            }

        } catch (error) {
            console.error("Gagal memuat dashboard:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Animasi Framer Motion
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-medium">Memuat Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            className="space-y-6 pb-20"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* 1. HEADER */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl">Dashboard</h3>
                    <p className="text-gray-500 text-sm mt-1">Ringkasan performa bisnis hari ini.</p>
                </div>
                <div className="flex items-center bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-sm text-gray-600 font-medium">
                    <Calendar size={16} className="mr-2 text-brand-primary" />
                    <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </motion.div>

            {/* 2. STATS CARDS (DATA REAL) */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        label: 'Total Pesanan', 
                        value: todayStats.totalOrders, 
                        icon: ShoppingBag, 
                        color: 'bg-brand-primary', 
                        text: 'text-white',
                        sub: 'Transaksi Hari Ini' 
                    },
                    { 
                        label: 'Omzet Hari Ini', 
                        value: `Rp ${(todayStats.totalRevenue / 1000).toFixed(0)}k`, 
                        fullValue: `Rp ${todayStats.totalRevenue.toLocaleString('id-ID')}`,
                        icon: DollarSign, 
                        color: 'bg-green-100', 
                        text: 'text-green-600',
                        sub: 'Pendapatan Bersih'
                    },
                    { 
                        label: 'Rata-rata Pembelian', 
                        value: `Rp ${(todayStats.avgTransaction / 1000).toFixed(0)}k`, 
                        icon: TrendingUp, 
                        color: 'bg-blue-100', 
                        text: 'text-blue-600',
                        sub: 'Per Transaksi'
                    },
                    { 
                        label: 'Diskon Diberikan', 
                        value: `Rp ${(todayStats.totalDiscount / 1000).toFixed(0)}k`, 
                        icon: XCircle, 
                        color: 'bg-orange-100', 
                        text: 'text-orange-600',
                        sub: 'Potongan Harga'
                    },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1 relative group">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">{stat.label}</p>
                                <h4 className="text-3xl font-bold text-brand-darkest group-hover:scale-105 transition-transform origin-left">
                                    {stat.value}
                                </h4>
                                {/* Tooltip Full Value untuk nominal yang disingkat */}
                                {stat.fullValue && (
                                    <div className="absolute left-6 top-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {stat.fullValue}
                                    </div>
                                )}
                            </div>
                            <div className={`p-3 rounded-xl ${stat.color} ${stat.text}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center text-xs font-medium text-gray-400">
                            {stat.sub}
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* 3. CHARTS SECTION */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* REVENUE CHART (7 HARI TERAKHIR) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-brand-darkest text-lg flex items-center gap-2">
                            <TrendingUp size={20} className="text-brand-primary" /> Tren Pendapatan (7 Hari)
                        </h4>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D92929" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#D92929" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#9CA3AF', fontSize: 12}} 
                                    dy={10} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#9CA3AF', fontSize: 12}} 
                                    tickFormatter={(value) => `${value/1000}k`} 
                                />
                                <Tooltip 
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                                    formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Omzet']} 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke="#D92929" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TOP PRODUCTS (7 HARI TERAKHIR) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-brand-darkest text-lg">Menu Terlaris (Minggu Ini)</h4>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
                        {topProducts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                                <p className="text-sm">Belum ada data penjualan minggu ini.</p>
                            </div>
                        ) : (
                            topProducts.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-default">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-bold text-gray-800 text-sm line-clamp-1">{item.name}</h5>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md">{item.qty_sold} Terjual</span>
                                            <span className="text-xs font-bold text-brand-primary">Rp {parseInt(item.revenue).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>

            {/* 4. BOTTOM SECTION: RECENT ORDERS (DATA REAL) */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h4 className="font-bold text-brand-darkest text-lg">Pesanan Terakhir (Live)</h4>
                    <span className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold animate-pulse">
                        Real-time
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 bg-gray-50/50 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4">Invoice</th>
                                <th className="px-6 py-4">Waktu</th>
                                <th className="px-6 py-4">Pelanggan</th>
                                <th className="px-6 py-4">Kasir</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                                        Belum ada transaksi hari ini.
                                    </td>
                                </tr>
                            ) : (
                                recentOrders.map((order, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-brand-primary">
                                            {order.invoice_no}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(order.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-700">
                                            {order.notes || 'Guest'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {order.cashier_name}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-800">
                                            Rp {parseInt(order.final_amount).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs px-3 py-1 rounded-full font-bold bg-green-100 text-green-600">
                                                Selesai
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}