import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, User, FileText, Trash2, Save, Truck, ArrowRight, Search, ChevronDown, X, Printer, Briefcase, Edit3, Phone, MapPin, List, Download, ChevronLeft, ChevronRight as ChevronRightIcon, CheckCircle } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

export default function Purchasing() {
    const [activeTab, setActiveTab] = useState('create_po'); // 'create_po', 'history', 'suppliers'

    // --- STATE MASTER DATA ---
    const [suppliers, setSuppliers] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    
    // --- STATE FORM HEADER ---
    const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNo, setInvoiceNo] = useState('');
    
    // State Search Supplier
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');
    const [showSupplierList, setShowSupplierList] = useState(false);
    const supplierInputRef = useRef(null);

    // --- STATE CART & ITEMS ---
    const [cart, setCart] = useState([]); 

    // State Search Bahan Baku (Item)
    const [selectedIng, setSelectedIng] = useState('');
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [showIngredientList, setShowIngredientList] = useState(false);
    const ingredientInputRef = useRef(null);

    const [qty, setQty] = useState('');
    const [price, setPrice] = useState(''); 

    // --- STATE MODAL SUPPLIER ---
    const [showSupModal, setShowSupModal] = useState(false);
    const [newSup, setNewSup] = useState({ name: '', contact_person: '', phone: '', address: '' });

    // --- STATE HISTORY PO ---
    const [historyPO, setHistoryPO] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const { showLoading, hideLoading, showAlert } = useUIStore();
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchData();
        // Click Outside Handler
        const handleClickOutside = (event) => {
            if (supplierInputRef.current && !supplierInputRef.current.contains(event.target)) setShowSupplierList(false);
            if (ingredientInputRef.current && !ingredientInputRef.current.contains(event.target)) setShowIngredientList(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load History saat tab pindah
    useEffect(() => {
        if (activeTab === 'history') fetchHistoryPO();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [supRes, ingRes] = await Promise.all([
                axios.get(API_URL + 'purchasing/suppliers', config),
                axios.get(API_URL + 'inventory/ingredients', config)
            ]);
            if (supRes.data.status) setSuppliers(supRes.data.data);
            if (ingRes.data.status) setIngredients(ingRes.data.data);
        } catch (error) { console.error(error); }
    };

    const fetchHistoryPO = async () => {
        setHistoryLoading(true);
        try {
            // Panggil endpoint dengan status=all untuk mendapatkan semua PO
            const res = await axios.get(API_URL + 'purchasing/pending&status=all', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setHistoryPO(res.data.data);
        } catch (error) { console.error(error); } finally { setHistoryLoading(false); }
    };

    // --- SUPPLIER HANDLERS ---
    const handleAddSupplier = async (e) => {
        e.preventDefault();
        try {
            await axios.post(API_URL + 'purchasing/suppliers', newSup, { headers: { Authorization: `Bearer ${token}` } });
            showAlert('success', 'Berhasil', 'Supplier ditambahkan');
            setNewSup({ name: '', contact_person: '', phone: '', address: '' }); setShowSupModal(false); fetchData();
        } catch (err) { showAlert('error', 'Gagal', 'Gagal tambah supplier'); }
    };

    const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));
    const selectSupplier = (supplier) => { setSelectedSupplier(supplier.id); setSupplierSearch(supplier.name); setShowSupplierList(false); };

    // --- INGREDIENT HANDLERS ---
    const filteredIngredients = ingredients.filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase()));
    const selectIngredient = (ing) => { setSelectedIng(ing.id); setIngredientSearch(ing.name); if (ing.cost_per_unit) setPrice(ing.cost_per_unit); else setPrice(''); setShowIngredientList(false); };

    // --- CART HANDLERS ---
    const addItemToCart = () => {
        if (!selectedIng || !qty || !price) return showAlert('error', 'Lengkapi Data', 'Pilih bahan, qty, dan harga');
        const ingDetail = ingredients.find(i => i.id == selectedIng);
        setCart([...cart, { id: selectedIng, name: ingDetail.name, unit: ingDetail.unit, qty: parseFloat(qty), price: parseFloat(price), subtotal: parseFloat(qty) * parseFloat(price) }]);
        setSelectedIng(''); setIngredientSearch(''); setQty(''); setPrice('');
    };

    const handleCreatePO = async () => {
        if (cart.length === 0) return showAlert('error', 'Kosong', 'Belum ada item');
        if (!selectedSupplier) return showAlert('error', 'Supplier Kosong', 'Pilih supplier tujuan.');

        showLoading('Membuat PO...');
        try {
            const finalInvoiceNo = invoiceNo || `PO-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(Math.random()*1000)}`;
            const payload = { supplier_id: selectedSupplier, invoice_no: finalInvoiceNo, date: poDate, total_amount: cart.reduce((sum, item) => sum + item.subtotal, 0), items: cart };
            const res = await axios.post(API_URL + 'purchasing/create', payload, { headers: { Authorization: `Bearer ${token}` } });
            
            if (res.data.status) {
                showAlert('success', 'PO Terbit', 'Purchase Order berhasil dibuat.');
                setCart([]); setInvoiceNo(''); setSelectedSupplier(''); setSupplierSearch('');
                // Pindah ke tab history untuk download
                setActiveTab('history');
            }
        } catch (err) { showAlert('error', 'Gagal', 'Gagal membuat PO'); } finally { hideLoading(); }
    };

    const handleDownloadPDF = (poId) => {
        window.open(`${API_URL}purchasing/download&id=${poId}&token=${token}`, '_blank');
    };

    const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl">Purchasing & Vendor</h3>
                    <p className="text-gray-500 text-sm">Kelola pembelian bahan baku dan data supplier.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                    <button onClick={() => setActiveTab('create_po')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'create_po' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <FileText size={16}/> Buat PO
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <List size={16}/> Riwayat PO
                    </button>
                    <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'suppliers' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Briefcase size={16}/> Data Vendor
                    </button>
                </div>
            </div>

            {/* --- TAB 1: BUAT PO --- */}
            {activeTab === 'create_po' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 space-y-4 h-fit">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} /> Info PO</h4>
                            <button onClick={() => navigate('/receiving')} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">Cek Penerimaan <ArrowRight size={12}/></button>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tanggal</label><input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">No. PO (Auto)</label><input type="text" placeholder="Auto Generate" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary bg-gray-50" /></div>
                        <div className="relative" ref={supplierInputRef}>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Supplier Tujuan</label>
                            <div className="relative"><input type="text" className="w-full border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Pilih Supplier..." value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); setSelectedSupplier(''); setShowSupplierList(true); }} onFocus={() => setShowSupplierList(true)} /><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} /></div>
                            {showSupplierList && (<div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">{filteredSuppliers.length > 0 ? (filteredSuppliers.map(s => (<div key={s.id} onClick={() => selectSupplier(s)} className="px-4 py-2 text-sm hover:bg-brand-bg cursor-pointer border-b border-gray-50 last:border-none text-gray-700">{s.name}</div>))) : (<div className="px-4 py-2 text-sm text-gray-400 text-center">Tidak ditemukan</div>)}</div>)}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ShoppingCart size={18} /> Item Pesanan</h4>
                        <div className="flex flex-col md:flex-row gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <div className="flex-1 relative" ref={ingredientInputRef}>
                                <div className="relative"><input type="text" className="w-full border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary bg-white" placeholder="Cari Bahan Baku..." value={ingredientSearch} onChange={(e) => { setIngredientSearch(e.target.value); setSelectedIng(''); setPrice(''); setShowIngredientList(true); }} onFocus={() => setShowIngredientList(true)} /><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} /></div>
                                {showIngredientList && (<div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">{filteredIngredients.length > 0 ? (filteredIngredients.map(i => (<div key={i.id} onClick={() => selectIngredient(i)} className="px-4 py-2 text-sm hover:bg-brand-bg cursor-pointer border-b border-gray-50 last:border-none"><p className="font-medium text-gray-800">{i.name}</p><p className="text-xs text-gray-500">Stok: {parseFloat(i.current_stock)} {i.unit}</p></div>))) : (<div className="px-4 py-2 text-sm text-gray-400 text-center">Tidak ditemukan</div>)}</div>)}
                            </div>
                            <input type="number" placeholder="Qty" className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={qty} onChange={e => setQty(e.target.value)} />
                            <div className="relative w-36"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span><input type="number" placeholder="Harga/Unit" className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={price} onChange={e => setPrice(e.target.value)} /></div>
                            <button onClick={addItemToCart} className="bg-brand-primary text-white p-2 rounded-lg hover:bg-brand-dark shadow-md transition-colors w-10 flex items-center justify-center shrink-0"><Plus size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-[250px]">
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                    <tr><th className="px-4 py-3 rounded-l-lg">Barang</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Harga</th><th className="px-4 py-3 text-right">Subtotal</th><th className="px-4 py-3 rounded-r-lg"></th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {cart.map((item, idx) => (<tr key={idx} className="hover:bg-gray-50/50 transition-colors"><td className="px-4 py-3 font-medium text-gray-800">{item.name}</td><td className="px-4 py-3 text-gray-600">{item.qty} {item.unit}</td><td className="px-4 py-3 text-gray-600">Rp {item.price.toLocaleString()}</td><td className="px-4 py-3 text-right font-bold text-brand-darkest">Rp {item.subtotal.toLocaleString()}</td><td className="px-4 py-3 text-center text-red-400 hover:text-red-600 cursor-pointer" onClick={() => setCart(cart.filter((_, i) => i !== idx))}><Trash2 size={16}/></td></tr>))}
                                </tbody>
                            </table>
                            {cart.length === 0 && (<div className="flex flex-col items-center justify-center h-40 text-gray-300"><ShoppingCart size={48} className="mb-2 opacity-20"/><p>Keranjang PO masih kosong.</p></div>)}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div><p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Total Estimasi</p><h3 className="text-2xl font-bold text-brand-darkest">Rp {grandTotal.toLocaleString('id-ID')}</h3></div>
                            <button onClick={handleCreatePO} disabled={cart.length === 0} className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg shadow-brand-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"><Save size={20} /> Terbitkan PO</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: RIWAYAT PO (BARU) --- */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><List size={20}/> Daftar Purchase Order</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Nomor PO</th>
                                    <th className="px-6 py-4">Tanggal</th>
                                    <th className="px-6 py-4">Supplier</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {historyPO.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Belum ada riwayat PO.</td></tr>
                                ) : historyPO.map(po => (
                                    <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-brand-primary">{po.invoice_no}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(po.purchase_date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{po.supplier_name}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-800">Rp {parseInt(po.total_amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${po.status === 'received' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {po.status === 'received' ? 'Diterima' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleDownloadPDF(po.id)}
                                                className="p-2 bg-gray-100 text-gray-600 hover:bg-brand-bg hover:text-brand-primary rounded-lg transition-colors"
                                                title="Download PDF"
                                            >
                                                <Download size={18}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB 3: MANAJEMEN SUPPLIER --- */}
            {activeTab === 'suppliers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div onClick={() => setShowSupModal(true)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-dashed flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-brand-primary hover:text-brand-primary hover:bg-brand-bg/10 transition-all h-48">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-white"><Plus size={24}/></div><span className="font-bold">Tambah Vendor Baru</span>
                    </div>
                    {suppliers.map(sup => (
                        <div key={sup.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">{sup.name.charAt(0).toUpperCase()}</div>
                                    <div><h4 className="font-bold text-gray-800">{sup.name}</h4><p className="text-xs text-gray-500">{sup.contact_person || 'No Contact'}</p></div>
                                </div>
                                <button className="text-gray-300 hover:text-brand-primary"><Edit3 size={16}/></button>
                            </div>
                            <div className="space-y-2 text-xs text-gray-500 mt-4 pt-3 border-t border-gray-50">
                                {sup.phone && <div className="flex items-center gap-2"><Phone size={14}/> {sup.phone}</div>}
                                {sup.address && <div className="flex items-center gap-2"><MapPin size={14}/> <span className="line-clamp-1">{sup.address}</span></div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL ADD SUPPLIER */}
            {showSupModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-gray-800">Tambah Vendor Baru</h3><button onClick={() => setShowSupModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
                        <form onSubmit={handleAddSupplier} className="space-y-3">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nama Perusahaan/Toko</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={newSup.name} onChange={e => setNewSup({...newSup, name: e.target.value})} autoFocus required /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Kontak Person (Sales)</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={newSup.contact_person} onChange={e => setNewSup({...newSup, contact_person: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nomor Telepon</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={newSup.phone} onChange={e => setNewSup({...newSup, phone: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Alamat</label><textarea className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" rows="2" value={newSup.address} onChange={e => setNewSup({...newSup, address: e.target.value})}></textarea></div>
                            <div className="flex gap-2 justify-end pt-2"><button type="button" onClick={() => setShowSupModal(false)} className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors">Batal</button><button type="submit" className="px-4 py-2 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-lg">Simpan</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}