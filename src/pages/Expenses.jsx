import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Calendar, DollarSign, FileText, Tag, Search, CheckCircle, AlertCircle, X } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State untuk Modal Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        category: 'Operasional',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    // State untuk Notifikasi Lokal (Pengganti window.alert)
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // Global Store (Hanya ambil yang tersedia)
    const { showLoading, hideLoading } = useUIStore();
    const token = localStorage.getItem('token');

    // --- FUNGSI HELPER NOTIFIKASI ---
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 3000); // Hilang otomatis dalam 3 detik
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredExpenses(expenses);
        } else {
            const lower = searchTerm.toLowerCase();
            const filtered = expenses.filter(item => 
                (item.description && item.description.toLowerCase().includes(lower)) || 
                (item.category && item.category.toLowerCase().includes(lower)) ||
                (item.user_name && item.user_name.toLowerCase().includes(lower))
            );
            setFilteredExpenses(filtered);
        }
    }, [searchTerm, expenses]);

    const fetchExpenses = async () => {
        showLoading('Memuat data...');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(API_URL + 'expenses', config);
            if (res.data.status) {
                setExpenses(res.data.data);
                setFilteredExpenses(res.data.data);
            }
        } catch (error) {
            console.error(error);
            showNotification('Gagal memuat data pengeluaran', 'error');
        } finally {
            hideLoading();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.description) {
            showNotification('Mohon lengkapi data deskripsi dan jumlah', 'error');
            return;
        }

        showLoading('Menyimpan...');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.post(API_URL + 'expenses', formData, config);
            
            if (res.data.status) {
                showNotification('Pengeluaran berhasil dicatat', 'success');
                setIsModalOpen(false);
                setFormData({
                    category: 'Operasional',
                    description: '',
                    amount: '',
                    date: new Date().toISOString().split('T')[0]
                });
                fetchExpenses();
            } else {
                showNotification(res.data.message || 'Gagal menyimpan', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Terjadi kesalahan server', 'error');
        } finally {
            hideLoading();
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus data ini?')) return;

        showLoading('Menghapus...');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.delete(`${API_URL}expenses&id=${id}`, config);
            
            if (res.data.status) {
                showNotification('Data berhasil dihapus', 'success');
                fetchExpenses();
            } else {
                showNotification('Gagal menghapus data', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Terjadi kesalahan saat menghapus', 'error');
        } finally {
            hideLoading();
        }
    };

    // Hitung Total
    const totalExpense = filteredExpenses.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

    return (
        <div className="p-6 space-y-6 pb-24 relative">
            
            {/* --- NOTIFICATION BANNER (LOCAL TOAST) --- */}
            {notification.show && (
                <div className={`fixed top-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-gray-200/50 animate-in slide-in-from-top-5 duration-300 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {notification.type === 'success' ? (
                        <CheckCircle size={20} className="text-white" />
                    ) : (
                        <AlertCircle size={20} className="text-white" />
                    )}
                    <p className="text-white font-medium text-sm pr-2">{notification.message}</p>
                    <button onClick={() => setNotification({ ...notification, show: false })} className="text-white/70 hover:text-white ml-2">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-brand-darkest">Pengeluaran Operasional</h1>
                    <p className="text-gray-500 text-sm mt-1">Catat biaya listrik, sewa, maintenance, dll.</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Total Pengeluaran (Tampil)</p>
                    <h2 className="text-3xl font-bold text-brand-primary">Rp {totalExpense.toLocaleString('id-ID')}</h2>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Cari deskripsi atau kategori..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary transition-colors"
                    />
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-primary/30"
                >
                    <Plus size={20} /> Catat Pengeluaran
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Kategori</th>
                                <th className="px-6 py-4">Deskripsi</th>
                                <th className="px-6 py-4">Dicatat Oleh</th>
                                <th className="px-6 py-4 text-right">Jumlah (Rp)</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            {new Date(item.expense_date).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{item.description}</td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">{item.user_name || '-'}</td>
                                        <td className="px-6 py-4 text-right font-bold text-brand-darkest">
                                            {parseFloat(item.amount).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">
                                        Belum ada data pengeluaran.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-xl text-gray-800">Tambah Pengeluaran</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <select 
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary appearance-none"
                                    >
                                        <option value="Operasional">Operasional (Listrik/Air/Internet)</option>
                                        <option value="Sewa">Sewa Tempat</option>
                                        <option value="Maintenance">Perbaikan & Maintenance</option>
                                        <option value="Marketing">Marketing & Iklan</option>
                                        <option value="Gaji">Gaji & Upah (Manual)</option>
                                        <option value="Lainnya">Lainnya</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nominal (Rp)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="number" 
                                        required
                                        min="0"
                                        placeholder="0"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <textarea 
                                        required
                                        rows="3"
                                        placeholder="Contoh: Bayar tagihan listrik bulan November"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary resize-none"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-lg shadow-brand-primary/30"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}