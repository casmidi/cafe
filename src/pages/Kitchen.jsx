import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, ChefHat, CheckCircle, Coffee, Utensils, RefreshCcw, ShoppingBag } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Kitchen() {
    const [orders, setOrders] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    
    const { showAlert } = useUIStore();
    const token = localStorage.getItem('token');

    // 1. Auto-Refresh Data Setiap 10 Detik
    useEffect(() => {
        fetchOrders(); // Load pertama
        const interval = setInterval(() => {
            fetchOrders();
        }, 10000); // 10000ms = 10 detik

        return () => clearInterval(interval); // Bersihkan interval saat pindah halaman
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await axios.get(API_URL + 'kitchen/orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setOrders(res.data.data);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Gagal memuat KDS", error);
        }
    };

    // 2. Fungsi Update Status Item
    const updateStatus = async (itemId, newStatus) => {
        try {
            // Optimistic UI Update
            setOrders(prevOrders => prevOrders.map(order => ({
                ...order,
                items: order.items.map(item => 
                    item.item_id === itemId ? { ...item, status: newStatus } : item
                )
            })));

            await axios.post(API_URL + 'kitchen/update-status', 
                { item_id: itemId, status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            fetchOrders(); // Sync ulang

        } catch (error) {
            showAlert('error', 'Gagal', 'Gagal update status');
            fetchOrders();
        }
    };

    return (
        <div className="space-y-6 pb-24">
            
            {/* Header KDS */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-primary text-white rounded-lg">
                        <ChefHat size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-brand-darkest">Kitchen Display System</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live Monitoring • Update: {lastUpdated.toLocaleTimeString('id-ID')}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={fetchOrders} 
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh Manual"
                >
                    <RefreshCcw size={20} />
                </button>
            </div>

            {/* Grid Tiket Pesanan */}
            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Coffee size={64} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">Tidak ada pesanan aktif.</p>
                    <p className="text-sm">Dapur sedang santai.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
                            
                            {/* HEADER TIKET: WARNA BEDA UNTUK DINE-IN & TAKEAWAY */}
                            <div className={`p-3 flex flex-col border-b-2 ${order.is_takeaway ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    {/* Nomor Meja / Take Away */}
                                    <span className={`px-3 py-1 rounded-lg font-black text-sm uppercase flex items-center gap-2 ${order.is_takeaway ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'}`}>
                                        {order.is_takeaway ? <ShoppingBag size={14}/> : <Utensils size={14}/>}
                                        {order.table_info}
                                    </span>
                                    
                                    {/* Timer (Warna merah jika lama) */}
                                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${parseInt(order.time_elapsed) > 20 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-white text-gray-500 border border-gray-200'}`}>
                                        <Clock size={12} /> {order.time_elapsed}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Pelanggan</p>
                                        <h3 className="font-bold text-gray-800 line-clamp-1 text-lg">{order.customer_name}</h3>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">#{order.invoice_no.slice(-4)}</span>
                                </div>
                            </div>

                            {/* LIST ITEM */}
                            <div className="p-3 space-y-3 flex-1 bg-white">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className={`flex flex-col gap-2 pb-3 border-b border-dashed border-gray-100 last:border-none ${item.status === 'ready' ? 'opacity-50 bg-gray-50 -mx-3 px-3' : ''}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-800 flex gap-2 text-sm items-start">
                                                    <span className="bg-gray-800 text-white w-6 h-6 flex items-center justify-center rounded-md text-xs shrink-0 mt-0.5">
                                                        {item.qty}
                                                    </span>
                                                    <span className={item.status === 'ready' ? 'line-through text-gray-400' : ''}>
                                                        {item.product_name}
                                                    </span>
                                                </div>
                                                {item.note && (
                                                    <p className="text-xs text-red-500 italic mt-1 ml-8 bg-red-50 p-1 rounded w-fit">
                                                        ⚠️ {item.note}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* TOMBOL AKSI */}
                                        <div className="ml-8 flex gap-1">
                                            {item.status === 'pending' && (
                                                <button 
                                                    onClick={() => updateStatus(item.item_id, 'cooking')}
                                                    className="w-full py-2 text-xs font-bold bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors border border-orange-200"
                                                >
                                                    Mulai Masak
                                                </button>
                                            )}
                                            
                                            {item.status === 'cooking' && (
                                                <button 
                                                    onClick={() => updateStatus(item.item_id, 'ready')}
                                                    className="w-full py-2 text-xs font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors border border-green-200 flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={14}/> Selesai Masak
                                                </button>
                                            )}

                                            {item.status === 'ready' && (
                                                <button 
                                                    onClick={() => updateStatus(item.item_id, 'served')}
                                                    className="w-full py-2 text-xs font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1 border border-blue-100"
                                                >
                                                    <Utensils size={12} /> Sajikan Ke Meja
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}