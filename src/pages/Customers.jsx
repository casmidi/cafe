import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Search, Edit3, Trash2, Phone, Mail, MapPin, Eye, Star, History, Award, X } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Customers() {
    // Inisialisasi dengan array kosong []
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // State untuk Modal Detail
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    
    const [form, setForm] = useState({ id: '', name: '', phone: '', email: '', address: '' });

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        showLoading('Memuat data...');
        try {
            const res = await axios.get(API_URL + 'customers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status && Array.isArray(res.data.data)) {
                setCustomers(res.data.data);
            } else {
                setCustomers([]); // Fallback
            }
        } catch (error) {
            console.error(error);
            setCustomers([]); // Pastikan tetap array jika error
        } finally {
            hideLoading();
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setForm({ id: '', name: '', phone: '', email: '', address: '' });
        setShowModal(true);
    };

    const openEditModal = (cust) => {
        setIsEditing(true);
        setForm({
            id: cust.id,
            name: cust.name,
            phone: cust.phone || '',
            email: cust.email || '',
            address: cust.address || ''
        });
        setShowModal(true);
    };

    const handleViewDetail = async (cust) => {
        showLoading('Memuat detail...');
        try {
            const res = await axios.get(API_URL + 'customers/detail&id=' + cust.id, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setSelectedCustomer(res.data.data);
                setShowDetailModal(true);
            }
        } catch (error) {
            showAlert('error', 'Gagal', 'Gagal memuat detail pelanggan');
        } finally {
            hideLoading();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        showLoading('Menyimpan...');
        try {
            if (isEditing) {
                await axios.put(API_URL + 'customers', form, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Data pelanggan diperbarui');
            } else {
                await axios.post(API_URL + 'customers', form, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Pelanggan baru ditambahkan');
            }
            setShowModal(false);
            fetchCustomers();
        } catch (error) {
            showAlert('error', 'Gagal', 'Terjadi kesalahan saat menyimpan');
        } finally {
            hideLoading();
        }
    };

    const handleDelete = (id) => {
        showConfirm('Hapus Pelanggan?', 'Data riwayat transaksi akan tetap ada, tapi data kontak akan dihapus.', async () => {
            showLoading('Menghapus...');
            try {
                await axios.delete(API_URL + 'customers&id=' + id, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showAlert('success', 'Terhapus', 'Pelanggan dihapus');
                fetchCustomers();
            } catch (error) {
                showAlert('error', 'Gagal', 'Gagal menghapus');
            } finally {
                hideLoading();
            }
        });
    };

    // Safe Filtering: Cek null/undefined sebelum toLowerCase
    const filteredData = Array.isArray(customers) ? customers.filter(c => {
        const nameMatch = c.name ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        const phoneMatch = c.phone ? c.phone.includes(searchQuery) : false;
        return nameMatch || phoneMatch;
    }) : [];

    // Helper Warna Tier
    const getTierBadgeColor = (tier) => {
        switch(tier) {
            case 'gold': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'platinum': return 'bg-slate-800 text-white border-slate-600';
            default: return 'bg-gray-100 text-gray-600 border-gray-200'; // Silver
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl">Data Pelanggan</h3>
                    <p className="text-gray-500 text-sm">Kelola database pelanggan dan loyalitas.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-dark font-medium transition-colors shadow-lg shadow-brand-primary/20"
                >
                    <Plus size={18} /> Tambah Pelanggan
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Cari nama atau no HP..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-accent outline-none"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid Pelanggan */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredData.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-400">
                        Tidak ada data pelanggan.
                    </div>
                ) : (
                    filteredData.map((cust) => (
                        <div key={cust.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg uppercase">
                                        {cust.name ? cust.name.charAt(0) : '?'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{cust.name}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${getTierBadgeColor(cust.tier)}`}>
                                            {cust.tier || 'Silver'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleViewDetail(cust)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg" title="Lihat Detail">
                                        <Eye size={16}/>
                                    </button>
                                    <button onClick={() => openEditModal(cust)} className="p-2 text-gray-400 hover:text-green-600 bg-gray-50 rounded-lg" title="Edit">
                                        <Edit3 size={16}/>
                                    </button>
                                    <button onClick={() => handleDelete(cust.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg" title="Hapus">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-500 mt-4 border-t border-dashed border-gray-100 pt-3">
                                {cust.phone && <div className="flex items-center gap-2"><Phone size={14}/> {cust.phone}</div>}
                                {cust.email && <div className="flex items-center gap-2"><Mail size={14}/> {cust.email}</div>}
                                
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                    <div className="flex items-center gap-1 text-orange-500 font-bold text-xs">
                                        <Star size={12} className="fill-orange-500"/> {parseInt(cust.points || 0)} Poin
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Total: Rp {parseInt(cust.total_spent || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL FORM TAMBAH/EDIT */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-brand-darkest">{isEditing ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                                <input type="text" required className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Nama Pelanggan" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. HP / WA</label>
                                    <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" placeholder="0812..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Opsional)</label>
                                    <input type="email" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" placeholder="@gmail.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat</label>
                                <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" rows="2" placeholder="Alamat lengkap..." value={form.address} onChange={e => setForm({...form, address: e.target.value})}></textarea>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Batal</button>
                                <button type="submit" className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL PELANGGAN */}
            {showDetailModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header Profil */}
                        <div className="p-6 bg-brand-primary text-white relative overflow-hidden">
                            <button onClick={() => setShowDetailModal(false)} className="absolute top-4 right-4 p-1 bg-white/20 rounded-full hover:bg-white/40 transition-colors"><X size={20}/></button>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30">
                                    {selectedCustomer.profile.name ? selectedCustomer.profile.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">{selectedCustomer.profile.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-brand-accent mt-1">
                                        <Award size={14}/> 
                                        <span className="uppercase font-bold tracking-wider">{selectedCustomer.profile.tier || 'Silver'} Member</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/20">
                                <div>
                                    <p className="text-xs text-brand-accent uppercase tracking-wide mb-1">Total Belanja</p>
                                    <p className="text-xl font-bold">Rp {parseInt(selectedCustomer.profile.total_spent || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-brand-accent uppercase tracking-wide mb-1">Poin Tersedia</p>
                                    <div className="flex items-center gap-1">
                                        <Star size={18} className="fill-yellow-400 text-yellow-400"/>
                                        <p className="text-xl font-bold">{parseInt(selectedCustomer.profile.points || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Riwayat Transaksi */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                                <History size={16}/> Riwayat Pembelian Terakhir
                            </h4>

                            <div className="space-y-3">
                                {!selectedCustomer.history || selectedCustomer.history.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">Belum ada riwayat transaksi.</div>
                                ) : (
                                    selectedCustomer.history.map(trx => (
                                        <div key={trx.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{trx.invoice_no}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(trx.created_at).toLocaleDateString('id-ID')} • {new Date(trx.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-brand-darkest">Rp {parseInt(trx.final_amount).toLocaleString()}</p>
                                                {parseInt(trx.points_earned) > 0 && (
                                                    <span className="text-[10px] text-green-600 flex items-center justify-end gap-0.5 mt-1 font-medium">
                                                        +{trx.points_earned} pts
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}