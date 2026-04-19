import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, Check, ShoppingBag, User, FileText, X, Loader2, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

export default function Header({ toggleSidebar, user }) {
    const [notifications, setNotifications] = useState([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    
    // --- STATE PENCARIAN GLOBAL ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ products: [], orders: [], customers: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');

    // Polling Notifikasi
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        
        // Event listener untuk klik di luar area search
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Debounce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 3) {
                performGlobalSearch();
            } else {
                setSearchResults({ products: [], orders: [], customers: [] });
                setShowSearchDropdown(false);
            }
        }, 600); // Tunggu 600ms setelah mengetik

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const performGlobalSearch = async () => {
        setIsSearching(true);
        setShowSearchDropdown(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Kita cari di 3 endpoint sekaligus
            const [prodRes, orderRes, custRes] = await Promise.allSettled([
                axios.get(API_URL + 'master/products', config), // Ambil semua produk (biasanya ringan) lalu filter client-side
                axios.get(`${API_URL}pos/history&search=${searchQuery}&limit=5`, config), // Search order via API
                axios.get(API_URL + 'customers', config) // Ambil customers lalu filter client-side
            ]);

            const results = {
                products: [],
                orders: [],
                customers: []
            };

            // 1. Filter Produk (Client Side Search karena endpoint getProducts ambil semua)
            if (prodRes.status === 'fulfilled' && prodRes.value.data.status) {
                const allProducts = prodRes.value.data.data;
                results.products = allProducts.filter(p => 
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                ).slice(0, 3); // Ambil top 3
            }

            // 2. Filter Order (Server Side Search)
            if (orderRes.status === 'fulfilled' && orderRes.value.data.status) {
                results.orders = orderRes.value.data.data.slice(0, 3);
            }

            // 3. Filter Customer (Client Side)
            if (custRes.status === 'fulfilled' && custRes.value.data.status) {
                const allCust = custRes.value.data.data;
                results.customers = allCust.filter(c => 
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (c.phone && c.phone.includes(searchQuery))
                ).slice(0, 3);
            }

            setSearchResults(results);

        } catch (error) {
            console.error("Search error", error);
        } finally {
            setIsSearching(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(API_URL + 'notifications/unread', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setNotifications(res.data.data);
            }
        } catch (error) {
            // Silent error
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await axios.post(API_URL + 'notifications/read', { id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    // --- NAVIGASI HASIL PENCARIAN ---
    const goToProduct = (prod) => {
        // Navigasi ke menu dan mungkin trigger modal edit (bisa dikembangkan nanti)
        // Saat ini kita arahkan ke halaman Menu saja
        navigate('/menu');
        setShowSearchDropdown(false);
    };

    const goToOrder = (invoice) => {
        // Arahkan ke halaman Orders dengan query pencarian invoice
        // Di halaman Orders.jsx sudah ada useEffect yang mendeteksi searchQuery, 
        // tapi kita perlu cara pass data. Cara termudah: navigate dan user input ulang, 
        // ATAU simpan di localStorage sementara.
        // Solusi simpel: Arahkan ke /orders
        navigate('/orders'); 
        // Idealnya: navigate(`/orders?search=${invoice}`) dan handle di Orders.jsx
        setShowSearchDropdown(false);
    };

    const goToCustomer = (cust) => {
        navigate('/customers');
        setShowSearchDropdown(false);
    };

    // Fungsi navigasi ke Profil
    const goToProfile = () => {
        navigate('/profile');
    };

    return (
        <header className="h-20 bg-white border-b border-gray-50 flex items-center justify-between px-6 lg:px-10 relative z-40">
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Menu size={24} />
                </button>
                <h2 className="text-xl font-bold text-gray-800 hidden sm:block">Dashboard</h2>
            </div>

            {/* --- GLOBAL SEARCH BAR --- */}
            <div className="hidden md:flex flex-1 max-w-md mx-8 relative" ref={searchRef}>
                <div className="relative w-full">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isSearching ? 'text-brand-primary animate-pulse' : 'text-gray-400'}`} size={20} />
                    <input 
                        type="text" 
                        placeholder="Cari menu, invoice, atau pelanggan..." 
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-gray-600 placeholder-gray-400 focus:ring-2 focus:ring-brand-accent focus:bg-white transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if(searchQuery.length >= 3) setShowSearchDropdown(true); }}
                    />
                    {searchQuery && (
                        <button onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* DROPDOWN HASIL PENCARIAN */}
                {showSearchDropdown && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in zoom-in-95 origin-top z-50">
                        {isSearching ? (
                            <div className="p-6 text-center text-gray-400 flex flex-col items-center">
                                <Loader2 className="animate-spin mb-2" size={24}/>
                                <span className="text-xs">Mencari data...</span>
                            </div>
                        ) : (
                            (!searchResults.products.length && !searchResults.orders.length && !searchResults.customers.length) ? (
                                <div className="p-4 text-center text-gray-400 text-sm">Tidak ditemukan hasil untuk "{searchQuery}"</div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto">
                                    
                                    {/* HASIL PRODUK */}
                                    {searchResults.products.length > 0 && (
                                        <div className="p-2">
                                            <p className="text-xs font-bold text-gray-400 uppercase px-2 mb-1">Menu / Produk</p>
                                            {searchResults.products.map(p => (
                                                <div key={p.id} onClick={() => goToProduct(p)} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer group">
                                                    <div className="w-8 h-8 bg-brand-bg rounded-lg flex items-center justify-center text-brand-primary shrink-0">
                                                        <ShoppingBag size={14}/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-800 truncate group-hover:text-brand-primary">{p.name}</p>
                                                        <p className="text-xs text-gray-500">Rp {parseInt(p.price).toLocaleString()}</p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-300"/>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* HASIL ORDER */}
                                    {searchResults.orders.length > 0 && (
                                        <div className="p-2 border-t border-gray-50">
                                            <p className="text-xs font-bold text-gray-400 uppercase px-2 mb-1 mt-1">Transaksi</p>
                                            {searchResults.orders.map(o => (
                                                <div key={o.id} onClick={() => goToOrder(o.invoice_no)} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer group">
                                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                                        <FileText size={14}/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600">{o.invoice_no}</p>
                                                        <p className="text-xs text-gray-500">{o.customer_name || 'Guest'} • Rp {parseInt(o.final_amount).toLocaleString()}</p>
                                                    </div>
                                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {o.payment_status}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* HASIL CUSTOMER */}
                                    {searchResults.customers.length > 0 && (
                                        <div className="p-2 border-t border-gray-50">
                                            <p className="text-xs font-bold text-gray-400 uppercase px-2 mb-1 mt-1">Pelanggan</p>
                                            {searchResults.customers.map(c => (
                                                <div key={c.id} onClick={() => goToCustomer(c)} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer group">
                                                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                                                        <User size={14}/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-800 truncate group-hover:text-purple-600">{c.name}</p>
                                                        <p className="text-xs text-gray-500">{c.phone || c.email || 'No Contact'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* NOTIFIKASI & PROFIL */}
            <div className="flex items-center gap-6">
                {/* NOTIFICATION BELL */}
                <div className="relative">
                    <button 
                        onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                        className={`relative p-2 transition-colors ${notifications.length > 0 ? 'text-brand-primary animate-pulse' : 'text-gray-400 hover:text-brand-primary'}`}
                    >
                        <Bell size={24} />
                        {notifications.length > 0 && (
                            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-brand-primary rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {/* DROPDOWN NOTIFIKASI */}
                    {showNotifDropdown && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 z-50">
                            <div className="p-3 border-b border-gray-50 font-bold text-gray-700 text-sm">Notifikasi ({notifications.length})</div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <p className="p-4 text-center text-gray-400 text-xs">Tidak ada pesan baru.</p>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} className="p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-800">{notif.title}</p>
                                                <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.created_at).toLocaleTimeString()}</p>
                                            </div>
                                            <button onClick={() => handleMarkRead(notif.id)} className="text-gray-300 hover:text-green-500 h-fit" title="Tandai dibaca">
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* PROFIL SECTION - KLIK UNTUK KE HALAMAN PROFIL */}
                <div 
                    className="flex items-center gap-3 pl-6 border-l border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={goToProfile}
                    title="Lihat Profil Saya"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-700">{user.name || 'User'}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role || 'Role'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center text-brand-darkest font-bold text-lg border-2 border-white shadow-sm">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                </div>
            </div>
        </header>
    );
}