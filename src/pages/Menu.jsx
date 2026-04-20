import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, Search, Tag, Box, Image as ImageIcon, Loader2, ChefHat, Trash2, X, ChevronDown, Info, Edit3, Calculator, Layers, CheckSquare, FlaskConical } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Menu() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');

    const [showAddCat, setShowAddCat] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState('');
    const [showProductModal, setShowProductModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Variant & Modifier State
    const [activeTab, setActiveTab] = useState('info');
    const [newVariant, setNewVariant] = useState({ name: '', price: '' });
    const [newModifier, setNewModifier] = useState({ name: '', price: '' });

    // Recipe Modal (Support Product/Variant/Modifier)
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [recipeTarget, setRecipeTarget] = useState({ type: 'product', id: null, name: '' }); // type: product/variant/modifier
    const [recipeItems, setRecipeItems] = useState([]);
    const [newRecipeItem, setNewRecipeItem] = useState({ ingredient_id: '', qty: '' });

    const [ingredientSearch, setIngredientSearch] = useState('');
    const [showIngredientList, setShowIngredientList] = useState(false);
    const ingredientInputRef = useRef(null);

    const [newCatName, setNewCatName] = useState('');
    const [prodForm, setProdForm] = useState({
        id: '', name: '', price: '', category_id: '', description: '', sku: '', image: '', variants: [], modifiers: []
    });

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchMasterData();
        const handleClickOutside = (event) => {
            if (ingredientInputRef.current && !ingredientInputRef.current.contains(event.target)) {
                setShowIngredientList(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchMasterData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [catRes, prodRes, ingRes] = await Promise.all([
                axios.get(API_URL + 'master/categories', config),
                axios.get(API_URL + 'master/products', config),
                axios.get(API_URL + 'inventory/ingredients', config)
            ]);

            if (catRes.data.status) setCategories(catRes.data.data);
            if (prodRes.data.status) setProducts(prodRes.data.data);
            if (ingRes.data.status) setIngredients(ingRes.data.data);

        } catch (error) {
            console.error("Gagal memuat data:", error);
            showAlert('error', 'Error', 'Gagal memuat data dari server.');
        }
    };

    // ... (Kategori & Produk Handlers tetap sama)
    const openCategoryModal = () => {
        setEditingCategoryId('');
        setNewCatName('');
        setShowAddCat(true);
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        showLoading('Menyimpan...');
        try {
            if (editingCategoryId) {
                await axios.put(API_URL + 'master/categories', { id: editingCategoryId, name: newCatName }, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Kategori diperbarui');
            } else {
                await axios.post(API_URL + 'master/categories', { name: newCatName }, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Kategori ditambahkan');
            }

            setEditingCategoryId('');
            setNewCatName('');
            fetchMasterData();
        } catch (error) {
            showAlert('error', 'Gagal', error.response?.data?.message || 'Gagal menyimpan kategori');
        } finally { hideLoading(); }
    };

    const handleEditCategory = (category) => {
        setEditingCategoryId(category.id);
        setNewCatName(category.name || '');
        setShowAddCat(true);
    };

    const handleDeleteCategory = (id) => {
        showConfirm('Hapus Kategori?', 'Kategori yang sudah dipakai produk tidak bisa dihapus.', async () => {
            showLoading('Menghapus...');
            try {
                await axios.delete(API_URL + 'master/categories&id=' + id, { headers: { Authorization: `Bearer ${token}` } });
                if (activeCategory == id) setActiveCategory('all');
                if (editingCategoryId == id) {
                    setEditingCategoryId('');
                    setNewCatName('');
                }
                showAlert('success', 'Berhasil', 'Kategori dihapus');
                fetchMasterData();
            } catch (error) {
                showAlert('error', 'Gagal', error.response?.data?.message || 'Gagal menghapus kategori');
            } finally {
                hideLoading();
            }
        });
    };

    const openAddProduct = () => {
        setIsEditing(false);
        setActiveTab('info');
        setProdForm({ id: '', name: '', price: '', category_id: '', description: '', sku: '', image: '', variants: [], modifiers: [] });
        setShowProductModal(true);
    };

    const openEditProduct = (product) => {
        setIsEditing(true);
        setActiveTab('info');
        setProdForm({
            id: product.id,
            name: product.name,
            price: product.price,
            category_id: product.category_id,
            description: product.description || '',
            sku: product.sku || '',
            image: product.image || '',
            variants: product.variants || [],
            modifiers: product.modifiers || []
        });
        setShowProductModal(true);
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        showLoading('Menyimpan...');
        try {
            if (isEditing) {
                await axios.put(API_URL + 'master/products', prodForm, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Produk diperbarui');
            } else {
                await axios.post(API_URL + 'master/products', prodForm, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Produk ditambahkan');
            }
            setShowProductModal(false); fetchMasterData();
        } catch (error) { showAlert('error', 'Gagal', 'Gagal menyimpan produk'); } finally { hideLoading(); }
    };

    // --- VARIANT & MODIFIER HANDLERS ---
    const handleAddVariant = async () => {
        if (!newVariant.name) return;
        try {
            await axios.post(API_URL + 'master/products/variant', {
                product_id: prodForm.id, name: newVariant.name, price: newVariant.price
            }, { headers: { Authorization: `Bearer ${token}` } });
            setNewVariant({ name: '', price: '' });
            const updated = await axios.get(API_URL + 'master/products', { headers: { Authorization: `Bearer ${token}` } });
            if (updated.data.status) {
                const p = updated.data.data.find(x => x.id === prodForm.id);
                if (p) setProdForm(prev => ({ ...prev, variants: p.variants }));
            }
        } catch (error) { showAlert('error', 'Gagal', 'Gagal tambah varian'); }
    };

    const handleDeleteVariant = async (id) => {
        try {
            await axios.delete(API_URL + 'master/products/variant&id=' + id, { headers: { Authorization: `Bearer ${token}` } });
            setProdForm(prev => ({ ...prev, variants: prev.variants.filter(v => v.id !== id) }));
        } catch (error) { showAlert('error', 'Gagal', 'Gagal hapus varian'); }
    };

    const handleAddModifier = async () => {
        if (!newModifier.name) return;
        try {
            await axios.post(API_URL + 'master/products/modifier', {
                product_id: prodForm.id, name: newModifier.name, price: newModifier.price
            }, { headers: { Authorization: `Bearer ${token}` } });
            setNewModifier({ name: '', price: '' });
            const updated = await axios.get(API_URL + 'master/products', { headers: { Authorization: `Bearer ${token}` } });
            if (updated.data.status) {
                const p = updated.data.data.find(x => x.id === prodForm.id);
                if (p) setProdForm(prev => ({ ...prev, modifiers: p.modifiers }));
            }
        } catch (error) { showAlert('error', 'Gagal', 'Gagal tambah modifier'); }
    };

    const handleDeleteModifier = async (id) => {
        try {
            await axios.delete(API_URL + 'master/products/modifier&id=' + id, { headers: { Authorization: `Bearer ${token}` } });
            setProdForm(prev => ({ ...prev, modifiers: prev.modifiers.filter(m => m.id !== id) }));
        } catch (error) { showAlert('error', 'Gagal', 'Gagal hapus modifier'); }
    };

    // --- RECIPE HANDLERS (Global) ---
    const openRecipe = async (type, item) => {
        // type: 'product', 'variant', 'modifier'
        // item: object data
        setRecipeTarget({ type, id: item.id, name: item.name });
        setShowRecipeModal(true);
        setNewRecipeItem({ ingredient_id: '', qty: '' });
        setIngredientSearch('');
        fetchRecipes(type, item.id);
    };

    const fetchRecipes = async (type, id) => {
        showLoading('Memuat Resep...');
        try {
            let url = '';
            if (type === 'product') url = API_URL + 'recipe&product_id=' + id;
            else url = API_URL + 'recipe/variant&type=' + type + '&id=' + id;

            const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setRecipeItems(res.data.data);
        } catch (error) { console.error(error); } finally { hideLoading(); }
    };

    const addIngredient = async (e) => {
        e.preventDefault();
        if (!newRecipeItem.ingredient_id || !newRecipeItem.qty) return showAlert('error', 'Validasi', 'Lengkapi data.');

        showLoading('Menambahkan...');
        try {
            if (recipeTarget.type === 'product') {
                await axios.post(API_URL + 'recipe', {
                    product_id: recipeTarget.id, ingredient_id: newRecipeItem.ingredient_id, qty: newRecipeItem.qty
                }, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.post(API_URL + 'recipe/variant', {
                    type: recipeTarget.type, target_id: recipeTarget.id, ingredient_id: newRecipeItem.ingredient_id, qty: newRecipeItem.qty
                }, { headers: { Authorization: `Bearer ${token}` } });
            }

            setNewRecipeItem({ ingredient_id: '', qty: '' });
            setIngredientSearch('');
            fetchRecipes(recipeTarget.type, recipeTarget.id);
            fetchMasterData(); // Update status has_recipe
            showAlert('success', 'Sukses', 'Bahan ditambahkan');
        } catch (error) { showAlert('error', 'Gagal', 'Gagal menambahkan bahan'); } finally { hideLoading(); }
    };

    const deleteIngredient = (id) => {
        showConfirm('Hapus Bahan?', 'Yakin hapus bahan ini dari resep?', async () => {
            showLoading('Menghapus...');
            try {
                if (recipeTarget.type === 'product') {
                    await axios.delete(API_URL + 'recipe&id=' + id, { headers: { Authorization: `Bearer ${token}` } });
                } else {
                    await axios.delete(API_URL + 'recipe/variant&id=' + id, { headers: { Authorization: `Bearer ${token}` } });
                }
                fetchRecipes(recipeTarget.type, recipeTarget.id);
                showAlert('success', 'Terhapus', 'Bahan dihapus.');
            } catch (error) { showAlert('error', 'Gagal', 'Gagal menghapus'); } finally { hideLoading(); }
        });
    };

    // Helpers
    const filteredIngredients = ingredients.filter(ing => ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()));
    const selectIngredient = (ing) => { setNewRecipeItem({ ...newRecipeItem, ingredient_id: ing.id }); setIngredientSearch(ing.name); setShowIngredientList(false); };
    const selectedIngredientDetail = ingredients.find(i => i.id == newRecipeItem.ingredient_id);
    const filteredProducts = activeCategory === 'all' ? products : products.filter(p => p.category_id == activeCategory);

    // HPP Calculation for Modal
    const totalHPP = recipeItems.reduce((total, r) => total + (parseFloat(r.qty_needed) * parseFloat(r.cost_per_unit || 0)), 0);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><h3 className="text-brand-darkest font-bold text-2xl">Manajemen Menu</h3><p className="text-gray-500 text-sm">Atur kategori, produk, dan resep (BOM).</p></div>
                <div className="flex gap-2">
                    <button onClick={openCategoryModal} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm"><Tag size={16} /> + Kategori</button>
                    <button onClick={openAddProduct} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-dark font-medium text-sm shadow-lg shadow-brand-primary/20"><Box size={16} /> + Produk Baru</button>
                </div>
            </div>

            <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'bg-brand-darkest text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>Semua Menu</button>
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat.id ? 'bg-brand-darkest text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{cat.name}</button>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.length > 0 ? filteredProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col h-full relative">
                        <button onClick={() => openEditProduct(product)} className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur rounded-full shadow-sm text-gray-500 hover:text-brand-primary hover:bg-white transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100" title="Edit Produk"><Edit3 size={16} /></button>
                        <div className="aspect-square rounded-xl bg-brand-bg flex items-center justify-center mb-3 relative overflow-hidden shrink-0">
                            {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <span className="text-4xl">🍽️</span>}
                            <div className="absolute bottom-2 left-2 bg-brand-darkest/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-white shadow-sm">Rp {parseInt(product.price).toLocaleString('id-ID')}</div>
                        </div>
                        <h4 className="font-bold text-gray-800 line-clamp-1 mb-1">{product.name}</h4>
                        <p className="text-xs text-gray-400 mb-4 line-clamp-1">{product.category_name || 'Tanpa Kategori'}</p>
                        <div className="mt-auto">
                            <button onClick={() => openRecipe('product', product)} className={`w-full py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-colors ${product.has_recipe == 1 ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-brand-bg hover:text-brand-primary hover:border-brand-primary'}`}>
                                <ChefHat size={14} /> {product.has_recipe == 1 ? 'Resep Utama' : 'Set Resep'}
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200"><Box className="w-12 h-12 mx-auto mb-2 opacity-20" /><p>Belum ada produk.</p></div>
                )}
            </div>

            {/* MODAL RESEP (Universal: Produk / Varian / Modifier) */}
            {showRecipeModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl h-[700px] flex flex-col">
                        <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <FlaskConical className="text-brand-primary" size={20} />
                                    <h3 className="font-bold text-lg text-gray-800">Resep: {recipeTarget.name}</h3>
                                </div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-bold bg-gray-100 px-2 py-0.5 rounded w-fit">{recipeTarget.type}</p>
                            </div>
                            <button onClick={() => setShowRecipeModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1 rounded-lg"><X size={20} /></button>
                        </div>

                        {/* Form Tambah Bahan */}
                        <div className="mb-4 bg-brand-bg/50 p-4 rounded-xl border border-brand-accent/20 relative transition-all">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Tambah Bahan Baku</p>
                            <div className="flex gap-2 items-start">
                                <div className="flex-1 relative" ref={ingredientInputRef}>
                                    <div className="relative">
                                        <input type="text" className="w-full border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Cari bahan baku..." value={ingredientSearch} onChange={(e) => { setIngredientSearch(e.target.value); setNewRecipeItem({ ...newRecipeItem, ingredient_id: '' }); setShowIngredientList(true); }} onFocus={() => setShowIngredientList(true)} />
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                    {showIngredientList && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                            {filteredIngredients.length > 0 ? filteredIngredients.map(ing => (
                                                <div key={ing.id} onClick={() => selectIngredient(ing)} className="px-3 py-2 text-sm hover:bg-brand-bg cursor-pointer border-b border-gray-50 last:border-none">
                                                    <p className="font-medium text-gray-800">{ing.name}</p>
                                                    <p className="text-xs text-gray-500">Stok: {parseFloat(ing.current_stock)} {ing.unit}</p>
                                                </div>
                                            )) : (<div className="px-3 py-2 text-sm text-gray-400 text-center">Tidak ditemukan.</div>)}
                                        </div>
                                    )}
                                </div>
                                <div className="w-28 relative flex items-center">
                                    <input type="number" step="0.001" required placeholder="Jml" className="w-full border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary text-center" value={newRecipeItem.qty} onChange={e => setNewRecipeItem({ ...newRecipeItem, qty: e.target.value })} />
                                    {selectedIngredientDetail && (<span className="absolute right-2 text-xs text-gray-400 font-medium pointer-events-none">{selectedIngredientDetail.unit}</span>)}
                                </div>
                                <button onClick={addIngredient} className="bg-brand-primary text-white p-2 rounded-lg hover:bg-brand-dark shadow-md h-[38px] w-[38px] flex items-center justify-center shrink-0"><Plus size={18} /></button>
                            </div>
                        </div>

                        {/* List Bahan */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 border-b border-gray-100 mb-4 pb-2">
                            {recipeItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center space-y-2">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><ChefHat className="opacity-30" size={24} /></div>
                                    <p className="text-sm">Belum ada bahan baku.</p>
                                </div>
                            ) : recipeItems.map((recipe, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl hover:border-brand-accent/50 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                        <div>
                                            <p className="font-bold text-gray-700 text-sm">{recipe.name}</p>
                                            <p className="text-xs text-gray-500">{parseFloat(recipe.qty_needed)} {recipe.unit} x Rp {parseInt(recipe.cost_per_unit || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteIngredient(recipe.id)} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>

                        {/* Info HPP */}
                        <div className="bg-brand-bg rounded-xl p-4 border border-brand-accent/20">
                            <div className="flex items-center gap-2 mb-1 text-brand-darkest"><Calculator size={16} /><h4 className="font-bold text-sm">HPP {recipeTarget.type === 'product' ? 'Produk' : (recipeTarget.type === 'variant' ? 'Tambahan Varian' : 'Tambahan Modifier')}</h4></div>
                            <div className="text-right">
                                <span className="block font-bold text-red-600 text-lg">Rp {totalHPP.toLocaleString('id-ID')}</span>
                                <span className="text-xs text-gray-500">Modal Bahan Baku</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddCat && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-gray-800">Kelola Kategori</h3><button onClick={() => setShowAddCat(false)}><X size={20} className="text-gray-400" /></button></div>
                        <form onSubmit={handleSaveCategory}>
                            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                                <input type="text" className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-primary outline-none" placeholder="Contoh: Makanan Berat" value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus required />
                                <button className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-dark">{editingCategoryId ? 'Update' : 'Tambah'}</button>
                                {editingCategoryId && (
                                    <button type="button" onClick={() => { setEditingCategoryId(''); setNewCatName(''); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl">Batal Edit</button>
                                )}
                            </div>

                            <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100 mb-4">
                                {categories.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-gray-400">Belum ada kategori.</div>
                                ) : categories.map(cat => (
                                    <div key={cat.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-gray-800">{cat.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => handleEditCategory(cat)} className="p-2 text-gray-500 hover:text-brand-primary bg-gray-50 hover:bg-brand-bg rounded-lg" title="Edit Kategori"><Edit3 size={14} /></button>
                                            <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-gray-500 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg" title="Hapus Kategori"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowAddCat(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl">Tutup</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PRODUK */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-800">{isEditing ? 'Edit Produk' : 'Tambah Produk'}</h3>
                            <button onClick={() => setShowProductModal(false)}><X size={20} className="text-gray-400" /></button>
                        </div>

                        {isEditing && (
                            <div className="flex bg-gray-50 p-1 rounded-xl mb-6 border border-gray-100">
                                <button onClick={() => setActiveTab('info')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'info' ? 'bg-white shadow text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>Info Dasar</button>
                                <button onClick={() => setActiveTab('variants')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'variants' ? 'bg-white shadow text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>Varian</button>
                                <button onClick={() => setActiveTab('modifiers')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'modifiers' ? 'bg-white shadow text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>Topping</button>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <form onSubmit={handleProductSubmit} className="space-y-4">
                                <input type="text" required className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-primary outline-none" placeholder="Nama Menu" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" required className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-primary outline-none" placeholder="Harga (Rp)" value={prodForm.price} onChange={e => setProdForm({ ...prodForm, price: e.target.value })} />
                                    <select required className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-primary bg-white outline-none" value={prodForm.category_id} onChange={e => setProdForm({ ...prodForm, category_id: e.target.value })}><option value="">Kategori...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                </div>
                                <input type="text" className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-primary outline-none" placeholder="SKU (Opsional)" value={prodForm.sku} onChange={e => setProdForm({ ...prodForm, sku: e.target.value })} />
                                <input type="text" className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-primary outline-none" placeholder="URL Gambar" value={prodForm.image} onChange={e => setProdForm({ ...prodForm, image: e.target.value })} />
                                <div className="flex gap-2 justify-end mt-6"><button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl">Batal</button><button className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-dark">Simpan</button></div>
                            </form>
                        )}

                        {activeTab === 'variants' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Nama (mis: Large)" className="flex-1 border rounded-lg px-3 py-2 text-sm" value={newVariant.name} onChange={e => setNewVariant({ ...newVariant, name: e.target.value })} />
                                    <input type="number" placeholder="+Harga" className="w-24 border rounded-lg px-3 py-2 text-sm" value={newVariant.price} onChange={e => setNewVariant({ ...newVariant, price: e.target.value })} />
                                    <button onClick={handleAddVariant} className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {prodForm.variants.length === 0 ? <p className="text-center text-gray-400 text-xs py-4">Belum ada varian.</p> : prodForm.variants.map(v => (
                                        <div key={v.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                            <div className="text-sm"><span className="font-bold text-gray-700">{v.name}</span> <span className="text-gray-500">+{parseInt(v.price_adjustment).toLocaleString()}</span></div>
                                            <div className="flex gap-1">
                                                {/* TOMBOL RESEP VARIAN */}
                                                <button onClick={() => openRecipe('variant', v)} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded" title="Resep Varian"><FlaskConical size={14} /></button>
                                                <button onClick={() => handleDeleteVariant(v.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'modifiers' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Nama (mis: Extra Keju)" className="flex-1 border rounded-lg px-3 py-2 text-sm" value={newModifier.name} onChange={e => setNewModifier({ ...newModifier, name: e.target.value })} />
                                    <input type="number" placeholder="Harga" className="w-24 border rounded-lg px-3 py-2 text-sm" value={newModifier.price} onChange={e => setNewModifier({ ...newModifier, price: e.target.value })} />
                                    <button onClick={handleAddModifier} className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {prodForm.modifiers.length === 0 ? <p className="text-center text-gray-400 text-xs py-4">Belum ada topping/modifier.</p> : prodForm.modifiers.map(m => (
                                        <div key={m.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                            <div className="text-sm"><span className="font-bold text-gray-700">{m.name}</span> <span className="text-gray-500">+{parseInt(m.price).toLocaleString()}</span></div>
                                            <div className="flex gap-1">
                                                {/* TOMBOL RESEP MODIFIER */}
                                                <button onClick={() => openRecipe('modifier', m)} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded" title="Resep Topping"><FlaskConical size={14} /></button>
                                                <button onClick={() => handleDeleteModifier(m.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}