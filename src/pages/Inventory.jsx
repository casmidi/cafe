import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Search, AlertTriangle, CheckCircle, Edit3, X, ChevronLeft, ChevronRight, Info, DollarSign, Scale, AlertCircle } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Inventory() {
    const [ingredients, setIngredients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ 
        id: '', name: '', unit: 'kg', current_stock: '', min_stock: '', cost_per_unit: '' 
    });

    const { showLoading, hideLoading, showAlert } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        fetchIngredients();
    }, [currentPage, searchQuery]); 

    const fetchIngredients = async () => {
        showLoading('Memuat stok...');
        try {
            const res = await axios.get(`${API_URL}inventory/ingredients&page=${currentPage}&limit=10&search=${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setIngredients(res.data.data);
                setTotalPages(res.data.pagination.total_pages);
                setTotalItems(res.data.pagination.total_items);
            }
        } catch (error) {
            console.error(error);
        } finally {
            hideLoading();
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setForm({ name: '', unit: 'kg', current_stock: '', min_stock: '', cost_per_unit: '' });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setIsEditing(true);
        // PERBAIKAN UTAMA: Parse float agar '15.0000' menjadi 15 di form input
        setForm({
            id: item.id,
            name: item.name,
            unit: item.unit,
            current_stock: parseFloat(item.current_stock), // Konversi ke number JS (hilangkan nol berlebih)
            min_stock: parseFloat(item.min_stock),         // Konversi ke number JS
            cost_per_unit: parseFloat(item.cost_per_unit)  // Konversi ke number JS
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        showLoading('Menyimpan...');
        try {
            if (isEditing) {
                await axios.put(API_URL + 'inventory/ingredients', form, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Data bahan baku diperbarui');
            } else {
                await axios.post(API_URL + 'inventory/ingredients', form, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Bahan baku baru ditambahkan');
            }
            setShowModal(false);
            fetchIngredients();
        } catch (error) {
            showAlert('error', 'Gagal', 'Terjadi kesalahan saat menyimpan data');
        } finally {
            hideLoading();
        }
    };

    // Helper: Tentukan apakah unit mendukung desimal
    const isDecimalUnit = (unit) => ['kg', 'liter', 'gram', 'ml'].includes(unit);
    const getInputStep = (unit) => isDecimalUnit(unit) ? "0.001" : "1";

    return (
        <div className="space-y-6 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl flex items-center gap-2">
                        <Package size={28}/> Stok Bahan Baku
                    </h3>
                    <p className="text-gray-500 text-sm">Kelola stok dan harga modal bahan untuk HPP.</p>
                </div>
                <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-dark font-medium shadow-lg shadow-brand-primary/20 transition-transform active:scale-95">
                    <Plus size={18} /> Tambah Bahan
                </button>
            </div>

            {/* TABEL STOK */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Cari bahan baku..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-accent outline-none"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full border">Total: {totalItems} Item</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 bg-gray-50 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4">Nama Bahan</th>
                                <th className="px-6 py-4 text-right">Stok Fisik</th>
                                <th className="px-6 py-4 text-center">Satuan</th>
                                <th className="px-6 py-4 text-right">Harga Beli (Avg)</th>
                                <th className="px-6 py-4 text-center">Status Stok</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {ingredients.map((item) => {
                                const current = parseFloat(item.current_stock);
                                const min = parseFloat(item.min_stock);
                                const isLow = current <= min;
                                
                                // Format Tampilan Angka: Hapus trailing zeros untuk tampilan bersih
                                const displayStock = parseFloat(current.toFixed(3)); 

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold text-base ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
                                            {displayStock}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs uppercase font-bold">{item.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            Rp {parseInt(item.cost_per_unit || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isLow ? (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100 flex items-center justify-center gap-1 w-fit mx-auto">
                                                    <AlertTriangle size={12} /> Menipis (Min: {min})
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100 flex items-center justify-center gap-1 w-fit mx-auto">
                                                    <CheckCircle size={12} /> Aman
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => openEditModal(item)} className="p-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all shadow-sm">
                                                <Edit3 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        <span className="text-sm text-gray-500 font-medium">Halaman {currentPage} dari {totalPages}</span>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL FORM */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-gray-50 p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                {isEditing ? <Edit3 size={20}/> : <Plus size={20}/>} 
                                {isEditing ? 'Edit Bahan Baku' : 'Tambah Bahan Baru'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                            
                            {/* SECTION 1: IDENTITAS */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Identitas Barang</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Bahan</label>
                                        <div className="relative">
                                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input 
                                                type="text" required 
                                                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" 
                                                placeholder="Contoh: Beras Premium" 
                                                value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                                        <select 
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer" 
                                            value={form.unit} 
                                            onChange={e => setForm({...form, unit: e.target.value})}
                                        >
                                            <optgroup label="Berat">
                                                <option value="kg">Kilogram (kg)</option>
                                                <option value="gram">Gram (gr)</option>
                                            </optgroup>
                                            <optgroup label="Volume">
                                                <option value="liter">Liter (l)</option>
                                                <option value="ml">Milliliter (ml)</option>
                                            </optgroup>
                                            <optgroup label="Jumlah">
                                                <option value="pcs">Pieces (pcs)</option>
                                                <option value="butir">Butir</option>
                                                <option value="porsi">Porsi</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: MANAJEMEN STOK */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                                <label className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <Scale size={14}/> Manajemen Stok
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Stok Saat Ini</label>
                                        <input 
                                            type="number" 
                                            step={getInputStep(form.unit)} 
                                            required 
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 text-blue-900 font-bold bg-white" 
                                            placeholder="0" 
                                            value={form.current_stock} 
                                            onChange={e => setForm({...form, current_stock: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                                            Min. Alert <Info size={12} className="text-gray-400"/>
                                        </label>
                                        <input 
                                            type="number" 
                                            step={getInputStep(form.unit)} 
                                            required 
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 text-red-600 bg-white" 
                                            placeholder="5" 
                                            value={form.min_stock} 
                                            onChange={e => setForm({...form, min_stock: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-blue-400 italic">
                                    *Satuan {form.unit} {isDecimalUnit(form.unit) ? 'mendukung desimal (koma).' : 'harus bilangan bulat.'}
                                </p>
                            </div>

                            {/* SECTION 3: VALUASI */}
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 space-y-3">
                                <label className="block text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <DollarSign size={14}/> Valuasi & HPP
                                </label>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Harga Beli Rata-rata (per {form.unit})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">Rp</span>
                                        <input 
                                            type="number" 
                                            required 
                                            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 bg-white font-medium" 
                                            placeholder="15000" 
                                            value={form.cost_per_unit} 
                                            onChange={e => setForm({...form, cost_per_unit: e.target.value})} 
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Digunakan untuk menghitung profit bersih saat produk terjual.</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors bg-gray-50">Batal</button>
                                <button type="submit" className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg shadow-brand-primary/30 transition-transform active:scale-95">Simpan Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}