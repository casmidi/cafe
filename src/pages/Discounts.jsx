import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Percent, DollarSign } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Discounts() {
    const [discounts, setDiscounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', type: 'percentage', value: '' });

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => { fetchDiscounts(); }, []);

    const fetchDiscounts = async () => {
        showLoading('Memuat data...');
        try {
            const res = await axios.get(API_URL + 'discounts', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setDiscounts(res.data.data);
        } catch (error) { console.error(error); } finally { hideLoading(); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        showLoading('Menyimpan...');
        try {
            await axios.post(API_URL + 'discounts', form, { headers: { Authorization: `Bearer ${token}` } });
            showAlert('success', 'Berhasil', 'Diskon ditambahkan');
            setShowModal(false); setForm({ name: '', type: 'percentage', value: '' }); fetchDiscounts();
        } catch (error) { showAlert('error', 'Gagal', 'Gagal menambah diskon'); } finally { hideLoading(); }
    };

    const handleToggle = async (id) => {
        try {
            await axios.put(API_URL + 'discounts', { id }, { headers: { Authorization: `Bearer ${token}` } });
            fetchDiscounts();
        } catch (error) { showAlert('error', 'Gagal', 'Gagal update status'); }
    };

    const handleDelete = (id) => {
        showConfirm('Hapus Diskon?', 'Data ini akan dihapus permanen.', async () => {
            try {
                await axios.delete(API_URL + 'discounts&id=' + id, { headers: { Authorization: `Bearer ${token}` } });
                fetchDiscounts();
            } catch (error) { showAlert('error', 'Gagal', 'Gagal menghapus'); }
        });
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div><h3 className="text-brand-darkest font-bold text-2xl">Manajemen Diskon</h3><p className="text-gray-500 text-sm">Atur promo dan potongan harga.</p></div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-dark shadow-lg"><Plus size={18} /> Tambah Diskon</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discounts.map((disc) => (
                    <div key={disc.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${disc.is_active ? 'border-brand-primary/30' : 'border-gray-200 opacity-60'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg">{disc.name}</h4>
                                <span className="text-xs text-gray-500">Dibuat: {new Date(disc.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="bg-brand-bg p-2 rounded-lg text-brand-primary font-bold">
                                {disc.type === 'percentage' ? `${parseInt(disc.value)}%` : `Rp ${parseInt(disc.value).toLocaleString()}`}
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-gray-50 mt-2">
                            <button onClick={() => handleToggle(disc.id)} className={`text-2xl transition-colors ${disc.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                                {disc.is_active ? <ToggleRight /> : <ToggleLeft />}
                            </button>
                            <button onClick={() => handleDelete(disc.id)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6">
                        <h3 className="font-bold text-lg mb-4">Buat Diskon Baru</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" required className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Nama Promo (Misal: Jumat Berkah)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setForm({...form, type: 'percentage'})} className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 ${form.type === 'percentage' ? 'bg-brand-bg border-brand-primary text-brand-darkest font-bold' : 'border-gray-200 text-gray-500'}`}><Percent size={16}/> Persen</button>
                                <button type="button" onClick={() => setForm({...form, type: 'fixed'})} className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 ${form.type === 'fixed' ? 'bg-brand-bg border-brand-primary text-brand-darkest font-bold' : 'border-gray-200 text-gray-500'}`}><DollarSign size={16}/> Rupiah</button>
                            </div>
                            <input type="number" required className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" placeholder={form.type === 'percentage' ? "Contoh: 10 (untuk 10%)" : "Contoh: 20000 (untuk Rp 20rb)"} value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Batal</button>
                                <button type="submit" className="flex-1 py-2 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}