import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TrendingUp, AlertTriangle, Clock, Award, AlertCircle, DollarSign, ShoppingBag, Zap } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Analytics() {
    const [stats, setStats] = useState({ revenue: 0, transactions: 0, avgTicket: 0 });
    const [menuAnalysis, setMenuAnalysis] = useState({ stars: [], dogs: [] });
    const [forecast, setForecast] = useState([]);
    const [peakHours, setPeakHours] = useState([]);
    const [busiestHour, setBusiestHour] = useState(null);
    
    const { showLoading, hideLoading } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        showLoading('Menganalisis Data...');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [resMenu, resStock, resPeak] = await Promise.all([
                axios.get(API_URL + 'analytics/menu', config),
                axios.get(API_URL + 'analytics/forecast', config),
                axios.get(API_URL + 'analytics/peak-hours', config)
            ]);

            // 1. Proses Menu (Sederhanakan Matrix menjadi 2 Kategori Utama)
            if(resMenu.data.status) {
                const rawData = resMenu.data.data;
                const stars = rawData.filter(i => i.category.includes('Star')).slice(0, 5); // Top 5 Juara
                const dogs = rawData.filter(i => i.category.includes('Dog')).slice(0, 5);   // Top 5 Kurang Laku
                
                setMenuAnalysis({ stars, dogs });
            }

            // 2. Proses Stok
            if(resStock.data.status) {
                setForecast(resStock.data.data.slice(0, 3)); // Ambil 3 teratas yang kritis
            }

            // 3. Proses Jam Sibuk
            if(resPeak.data.status) {
                const rawHours = resPeak.data.data; // Array [0..23]
                const chartData = rawHours.map((count, hour) => ({
                    hour: `${hour}:00`,
                    count: count,
                    fullHour: hour
                }));
                setPeakHours(chartData);

                // Cari jam tersibuk
                const maxCount = Math.max(...rawHours);
                const busiest = chartData.find(d => d.count === maxCount);
                setBusiestHour(busiest ? busiest.hour : '-');
            }

        } catch (error) {
            console.error(error);
        } finally {
            hideLoading();
        }
    };

    return (
        <div className="space-y-10 pb-24 animate-in fade-in duration-500">
            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold text-brand-darkest">Wawasan Bisnis</h1>
                <p className="text-gray-500 text-sm">Rangkuman performa restoran dalam 30 hari terakhir.</p>
            </div>

            {/* 1. KARTU UTAMA (Highlight) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                        <Clock size={28} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Jam Tersibuk</p>
                        <h3 className="text-3xl font-bold text-gray-800">{busiestHour}</h3>
                        <p className="text-xs text-blue-500 font-medium mt-1">Siapkan staf lebih banyak!</p>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <div className="p-4 bg-green-50 text-green-600 rounded-2xl shrink-0">
                        <Award size={28} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Menu Juara</p>
                        <h3 className="text-xl font-bold text-gray-800 line-clamp-1" title={menuAnalysis.stars[0]?.name}>{menuAnalysis.stars[0]?.name || '-'}</h3>
                        <p className="text-xs text-green-500 font-medium mt-1">Paling laris & untung</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl shrink-0">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Stok Kritis</p>
                        <h3 className="text-3xl font-bold text-gray-800">{forecast.length} Item</h3>
                        <p className="text-xs text-red-500 font-medium mt-1">Segera belanja ulang</p>
                    </div>
                </div>
            </div>

            {/* 2. GRAFIK JAM SIBUK (Lebih Sederhana) */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="mb-8">
                    <h3 className="font-bold text-gray-800 text-xl">Kepadatan Pelanggan</h3>
                    <p className="text-sm text-gray-500">Pola kedatangan pelanggan berdasarkan jam.</p>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={peakHours}>
                            <defs>
                                <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="hour" tick={{fontSize: 11, fill: '#9CA3AF'}} interval={3} axisLine={false} tickLine={false} dy={10} />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}
                                formatter={(value) => [value + ' Transaksi', 'Jumlah']}
                            />
                            <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorPeak)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. ANALISIS MENU & REKOMENDASI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* MENU JUARA */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg">
                        <Award size={24} className="text-green-500"/> Menu Bintang
                    </h4>
                    <p className="text-xs text-gray-500 mb-6 bg-green-50 p-3 rounded-xl border border-green-100 leading-relaxed">
                        Menu ini sangat diminati dan memberikan keuntungan besar. <b>Jangan ubah resep atau harga!</b>
                    </p>
                    <div className="space-y-4">
                        {menuAnalysis.stars.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">Belum ada data cukup.</p> : 
                        menuAnalysis.stars.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-none">
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-green-100 text-2xl w-8 text-center">#{idx+1}</span>
                                    <span className="font-bold text-gray-700 text-sm">{item.name}</span>
                                </div>
                                <span className="text-xs font-bold bg-green-50 px-3 py-1.5 rounded-lg text-green-700">{item.qty} Terjual</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MENU EVALUASI */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg">
                        <AlertCircle size={24} className="text-red-500"/> Menu Perlu Evaluasi
                    </h4>
                    <p className="text-xs text-gray-500 mb-6 bg-red-50 p-3 rounded-xl border border-red-100 leading-relaxed">
                        Menu ini kurang laku dan untungnya kecil. Pertimbangkan untuk <b>ganti resep, promosi, atau hapus</b>.
                    </p>
                    <div className="space-y-4">
                        {menuAnalysis.dogs.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">Semua menu performa baik.</p> : 
                        menuAnalysis.dogs.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-none">
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-red-100 text-2xl w-8 text-center">!</span>
                                    <span className="font-bold text-gray-700 text-sm">{item.name}</span>
                                </div>
                                <span className="text-xs font-bold bg-red-50 px-3 py-1.5 rounded-lg text-red-700">{item.qty} Terjual</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. PREDIKSI STOK HABIS */}
            {forecast.length > 0 && (
                <div className="bg-red-50/50 border border-red-100 p-8 rounded-3xl">
                    <h4 className="font-bold text-red-800 mb-6 flex items-center gap-3 text-lg">
                        <Zap size={24} className="fill-red-800"/> Prediksi Kehabisan Stok (AI Lite)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {forecast.map((item, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center border border-red-100">
                                <div>
                                    <p className="font-bold text-gray-800 text-base mb-1">{item.name}</p>
                                    <p className="text-xs text-gray-500">Sisa: {parseFloat(item.stock)} {item.unit}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Habis Dalam</p>
                                    <p className="text-2xl font-black text-red-600">{item.days_left} Hari</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}