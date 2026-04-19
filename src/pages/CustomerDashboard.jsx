import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, History, LogOut, Award, Calendar, Receipt, User, ChevronLeft, ChevronRight, X, CheckCircle, Clock, MapPin, Edit3, Lock, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import useUIStore from '../store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomerDashboard() {
    const [profile, setProfile] = useState(null);
    const [history, setHistory] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal State
    const [selectedTrx, setSelectedTrx] = useState(null);
    const [showEditProfile, setShowEditProfile] = useState(false);

    // Form Edit Profile
    const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', password: '', address: '' });

    const navigate = useNavigate();
    const { showLoading, hideLoading, showAlert } = useUIStore();

    const token = localStorage.getItem('customerToken');

    useEffect(() => {
        if (!token) {
            navigate('/member/login');
            return;
        }
        fetchData();
    }, [currentPage]);

    const fetchData = async () => {
        showLoading('Memuat profil...');
        try {
            const res = await axios.get(`${API_URL}customer/profile&page=${currentPage}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setProfile(res.data.data.profile);
                setHistory(res.data.data.history);

                // Set data awal form
                setEditForm({
                    name: res.data.data.profile.name,
                    phone: res.data.data.profile.phone || '',
                    email: res.data.data.profile.email || '',
                    address: res.data.data.profile.address || '',
                    password: '' // Kosong default
                });

                if (res.data.data.pagination) {
                    setTotalPages(res.data.data.pagination.total_pages);
                }
            }
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                localStorage.removeItem('customerToken');
                navigate('/member/login');
            }
        } finally {
            hideLoading();
        }
    };

    const fetchTransactionDetail = async (invoiceNo) => {
        showLoading('Memuat detail...');
        try {
            const res = await axios.get(`${API_URL}pos/detail&invoice=${invoiceNo}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                setSelectedTrx(res.data.data);
            }
        } catch (error) {
            console.error("Gagal load detail", error);
        } finally {
            hideLoading();
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        showLoading('Menyimpan perubahan...');
        try {
            // Kita kirim ke endpoint baru
            const res = await axios.put(API_URL + 'customer/update-profile', editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                showAlert('success', 'Berhasil', 'Profil Anda telah diperbarui.');
                setShowEditProfile(false);
                fetchData(); // Refresh data
            } else {
                showAlert('error', 'Gagal', res.data.message);
            }
        } catch (error) {
            showAlert('error', 'Error', error.response?.data?.message || 'Gagal update profil');
        } finally {
            hideLoading();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerData');
        navigate('/member/login');
    };

    // Desain Kartu: Warna & Style Berdasarkan Tier
    const getCardStyle = (tier) => {
        switch (tier) {
            case 'gold':
                return {
                    bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
                    text: 'text-yellow-50',
                    border: 'border-yellow-300/50',
                    shadow: 'shadow-yellow-500/40',
                    iconColor: 'text-yellow-200'
                };
            case 'platinum':
                return {
                    bg: 'bg-gradient-to-br from-slate-700 via-slate-800 to-black',
                    text: 'text-slate-100',
                    border: 'border-slate-600/50',
                    shadow: 'shadow-slate-800/40',
                    iconColor: 'text-slate-400'
                };
            default: // Silver
                return {
                    bg: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500',
                    text: 'text-gray-100',
                    border: 'border-gray-300/50',
                    shadow: 'shadow-gray-400/40',
                    iconColor: 'text-gray-200'
                };
        }
    };

    const cardStyle = profile ? getCardStyle(profile.tier) : {};

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">

            {/* HEADER & CARD SECTION */}
            <div className="bg-white p-6 pt-8 pb-24 rounded-b-[3rem] shadow-sm relative z-10 overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl"></div>

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                        <p className="text-gray-400 text-xs font-medium">Selamat Datang,</p>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-brand-darkest truncate max-w-[180px]">{profile.name}</h1>
                            <button onClick={() => setShowEditProfile(true)} className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:text-brand-primary">
                                <Edit3 size={14} />
                            </button>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm">
                        <LogOut size={18} />
                    </button>
                </div>

                {/* PREMIUM DIGITAL MEMBER CARD */}
                <div className={`relative w-full aspect-[1.58/1] rounded-2xl p-6 ${cardStyle.bg} ${cardStyle.text} shadow-2xl ${cardStyle.shadow} overflow-hidden transform transition-transform hover:scale-[1.02] duration-500 group`}>

                    {/* Glass Effect Overlay */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Decorative Patterns */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>

                    {/* Card Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between">

                        {/* Top Row: Chip & Contactless */}
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-8 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md border border-yellow-600/30 shadow-inner flex items-center justify-center">
                                <div className="w-full h-[1px] bg-yellow-600/20 mb-[2px]"></div>
                                <div className="w-full h-[1px] bg-yellow-600/20 mt-[2px]"></div>
                            </div>
                            <div className="flex flex-col items-end">
                                <img src="/taskora-icon.png?v=86" className="w-8 h-8 opacity-90 brightness-0 invert" alt="Logo" />
                                <span className="text-[10px] uppercase tracking-widest opacity-70 mt-1 font-bold">Cafe 86 Member</span>
                            </div>
                        </div>

                        {/* Middle: Points */}
                        <div className="mt-2">
                            <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">Saldo Poin</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-mono font-bold tracking-tighter text-white drop-shadow-sm">
                                    {parseInt(profile.points).toLocaleString()}
                                </span>
                                <span className="text-xs font-medium opacity-80">PTS</span>
                            </div>
                        </div>

                        {/* Bottom: Tier & ID */}
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] uppercase opacity-60 mb-0.5">Member ID</p>
                                <p className="font-mono text-sm tracking-widest opacity-90">{profile.phone}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                <Award size={16} className="text-white" />
                                <span className="text-xs font-bold uppercase tracking-wide text-white">{profile.tier}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIWAYAT TRANSAKSI */}
            <div className="px-6 -mt-10 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 min-h-[400px] overflow-hidden">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <History size={20} className="text-brand-primary" /> Riwayat Pesanan
                        </h3>
                        <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-500 font-medium">
                            Terbaru
                        </span>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                                <Receipt size={64} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">Belum ada riwayat transaksi.</p>
                            </div>
                        ) : (
                            history.map(trx => (
                                <div
                                    key={trx.id}
                                    onClick={() => fetchTransactionDetail(trx.invoice_no)}
                                    className="p-5 hover:bg-brand-bg/30 transition-colors cursor-pointer group relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm group-hover:text-brand-primary transition-colors">{trx.outlet_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                                                    <Calendar size={10} /> {new Date(trx.created_at).toLocaleDateString('id-ID')}
                                                </p>
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock size={10} /> {new Date(trx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-brand-darkest text-sm block">Rp {parseInt(trx.final_amount).toLocaleString()}</span>
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold inline-block mt-1 ${trx.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {trx.payment_status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-3">
                                        <p className="text-[10px] text-gray-400 font-mono">#{trx.invoice_no}</p>

                                        {parseInt(trx.points_earned) > 0 && (
                                            <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold border border-yellow-100">
                                                <Star size={8} className="fill-yellow-500 text-yellow-500" /> +{trx.points_earned} Poin
                                            </span>
                                        )}
                                    </div>

                                    <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {history.length > 0 && (
                        <div className="p-4 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm disabled:opacity-50 disabled:shadow-none hover:bg-gray-50 transition-all"
                            >
                                <ChevronLeft size={14} /> Prev
                            </button>
                            <span className="text-xs font-medium text-gray-400">Hal {currentPage} / {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm disabled:opacity-50 disabled:shadow-none hover:bg-gray-50 transition-all"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DETAIL TRANSAKSI */}
            <AnimatePresence>
                {selectedTrx && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 pb-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">Detail Pesanan</h3>
                                    <p className="text-xs text-gray-500 font-mono">{selectedTrx.invoice_no}</p>
                                </div>
                                <button onClick={() => setSelectedTrx(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="overflow-y-auto p-6 flex-1">
                                {/* Status Badge */}
                                <div className="flex justify-center mb-6">
                                    <div className={`flex flex-col items-center ${selectedTrx.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                                        {selectedTrx.payment_status === 'paid' ? <CheckCircle size={48} className="mb-2" /> : <Clock size={48} className="mb-2" />}
                                        <h4 className="font-bold text-xl uppercase">{selectedTrx.payment_status === 'paid' ? 'Pembayaran Berhasil' : 'Menunggu Pembayaran'}</h4>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(selectedTrx.created_at).toLocaleString('id-ID')}</p>
                                    </div>
                                </div>

                                {/* List Items */}
                                <div className="space-y-4 mb-6">
                                    {selectedTrx.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start pb-4 border-b border-dashed border-gray-100 last:border-none">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 text-sm">{item.qty}x {item.name}</p>
                                            </div>
                                            <p className="font-medium text-gray-600 text-sm">Rp {(item.price * item.qty).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Rincian Biaya */}
                                <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm text-gray-600">
                                    <div className="flex justify-between"><span>Subtotal</span><span>Rp {parseInt(selectedTrx.total_amount).toLocaleString()}</span></div>
                                    {parseInt(selectedTrx.discount_amount) > 0 && (
                                        <div className="flex justify-between text-green-600"><span>Diskon</span><span>-Rp {parseInt(selectedTrx.discount_amount).toLocaleString()}</span></div>
                                    )}
                                    {parseInt(selectedTrx.tax_amount) > 0 && (
                                        <div className="flex justify-between"><span>Pajak</span><span>Rp {parseInt(selectedTrx.tax_amount).toLocaleString()}</span></div>
                                    )}
                                    {parseInt(selectedTrx.service_charge) > 0 && (
                                        <div className="flex justify-between"><span>Service</span><span>Rp {parseInt(selectedTrx.service_charge).toLocaleString()}</span></div>
                                    )}
                                    <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-lg text-brand-darkest mt-2">
                                        <span>Total Bayar</span>
                                        <span>Rp {parseInt(selectedTrx.final_amount).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Info Poin di Modal */}
                                {parseInt(selectedTrx.points_earned) > 0 && (
                                    <div className="mt-4 flex justify-center">
                                        <span className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-yellow-100 shadow-sm">
                                            <Star size={14} className="fill-yellow-500 text-yellow-500" />
                                            Anda mendapatkan +{selectedTrx.points_earned} Poin dari transaksi ini!
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-white">
                                <button onClick={() => setSelectedTrx(null)} className="w-full py-3 bg-brand-darkest text-white font-bold rounded-xl hover:bg-brand-dark transition-transform active:scale-95 shadow-lg">
                                    Tutup
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL EDIT PROFILE */}
            <AnimatePresence>
                {showEditProfile && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-brand-darkest">Edit Profil</h3>
                                <button onClick={() => setShowEditProfile(false)}><X size={20} className="text-gray-400" /></button>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama (Tidak dapat diubah)</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            disabled
                                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor HP</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={editForm.phone}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                                            placeholder="08..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                                        <textarea
                                            value={editForm.address}
                                            onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                                            rows="2"
                                            placeholder="Alamat lengkap..."
                                        ></textarea>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password Baru (Opsional)</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="password"
                                            value={editForm.password}
                                            onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                                            placeholder="Kosongkan jika tidak diganti"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button type="button" onClick={() => setShowEditProfile(false)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200">Batal</button>
                                    <button type="submit" className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg">Simpan</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}