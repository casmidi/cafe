import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, User, Printer, CheckCircle, X, Users, Tag, AlertCircle, Utensils, Coffee, ChevronRight, Clock, Star, Bluetooth } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import Receipt from '../components/Receipt';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { BluetoothPrinter } from '../utils/bluetoothPrinter'; // Import Helper

export default function POS() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [discounts, setDiscounts] = useState([]); 
    const [tables, setTables] = useState([]); 
    
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [settings, setSettings] = useState({ 
        name: '', address: '', phone: '', tax_rate: 10, service_charge_rate: 0, receipt_footer: '',
        point_conversion_rate: 10000, point_value_idr: 500 
    });
    
    const [cart, setCart] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);
    const customerInputRef = useRef(null);

    const [orderType, setOrderType] = useState('dine_in'); 
    const [selectedTable, setSelectedTable] = useState('');

    const [selectedDiscount, setSelectedDiscount] = useState(null); 
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash'); 
    const [cashReceived, setCashReceived] = useState(''); 
    const [receiptData, setReceiptData] = useState(null);
    const componentRef = useRef();

    const [pointsToRedeem, setPointsToRedeem] = useState(0);
    const [redeemValue, setRedeemValue] = useState(0);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false); 
    const [mobileTab, setMobileTab] = useState('menu'); 

    const [showVariantModal, setShowVariantModal] = useState(false);
    const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedModifiers, setSelectedModifiers] = useState([]);
    
    const { showLoading, hideLoading, showAlert } = useUIStore();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();

    useEffect(() => {
        checkShiftStatus();
        fetchData();
        fetchSettings();
        const handleClickOutside = (event) => {
            if (customerInputRef.current && !customerInputRef.current.contains(event.target)) setShowCustomerList(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const checkShiftStatus = async () => {
        try {
            const res = await axios.get(API_URL + 'shift/current', { headers: { Authorization: `Bearer ${token}` } });
            if (!res.data.status) { showAlert('warning', 'Shift Belum Dibuka', 'Silakan buka shift terlebih dahulu.'); navigate('/shift'); }
        } catch (error) { console.error("Gagal cek shift", error); }
    };

    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [catRes, prodRes, custRes, discRes, tableRes] = await Promise.all([
                axios.get(API_URL + 'master/categories', config),
                axios.get(API_URL + 'master/products', config),
                axios.get(API_URL + 'customers', config),
                axios.get(API_URL + 'discounts&active=true', config),
                axios.get(API_URL + 'master/tables', config)
            ]);
            if(catRes.data.status) setCategories(catRes.data.data);
            if(prodRes.data.status) setProducts(prodRes.data.data);
            if(custRes.data.status) setCustomers(custRes.data.data);
            if(discRes.data.status) setDiscounts(discRes.data.data);
            if(tableRes.data.status) setTables(tableRes.data.data);
        } catch (error) { console.error(error); }
    };

    const fetchSettings = async () => {
        const localSettings = localStorage.getItem('outletSettings');
        if (localSettings) setSettings(JSON.parse(localSettings));
        try {
            const res = await axios.get(API_URL + 'settings', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) { setSettings(res.data.data); localStorage.setItem('outletSettings', JSON.stringify(res.data.data)); }
        } catch (error) { console.error(error); }
    };

    const handleProductClick = (product) => {
        if ((product.variants && product.variants.length > 0) || (product.modifiers && product.modifiers.length > 0)) {
            setSelectedProductForVariant(product);
            setSelectedVariant(null); 
            setSelectedModifiers([]);
            setShowVariantModal(true);
        } else {
            addToCart(product);
        }
    };

    const addToCart = (product, variant = null, modifiers = []) => {
        const variantId = variant ? variant.id : 'base';
        const modifierIds = modifiers.map(m => m.id).sort().join('-');
        const cartItemId = `${product.id}-${variantId}-${modifierIds}`;

        let itemPrice = parseFloat(product.price);
        if (variant) itemPrice += parseFloat(variant.price_adjustment);
        modifiers.forEach(m => itemPrice += parseFloat(m.price));

        const existingItem = cart.find(item => item.cartItemId === cartItemId);
        
        if (existingItem) {
            setCart(cart.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, {
                ...product,
                cartItemId,
                qty: 1,
                price: itemPrice,
                variant_id: variant ? variant.id : null,
                variant_name: variant ? variant.name : null,
                modifiers: modifiers.map(m => m.id),
                modifiers_name: modifiers.map(m => m.name)
            }]);
        }
        setShowVariantModal(false);
    };

    const confirmVariantSelection = () => {
        addToCart(selectedProductForVariant, selectedVariant, selectedModifiers);
    };

    const updateQty = (cartItemId, delta) => {
        setCart(cart.map(item => item.cartItemId === cartItemId ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter(item => item.qty > 0));
    };

    const handleSelectCustomer = (cust) => { 
        setSelectedCustomer(cust); 
        setCustomerSearch(cust.name); 
        setShowCustomerList(false); 
        setPointsToRedeem(0);
        setRedeemValue(0);
    };
    
    const clearCustomer = () => { 
        setSelectedCustomer(null); 
        setCustomerSearch(''); 
        setPointsToRedeem(0);
        setRedeemValue(0);
    };

    const handleRedeemPoints = (pts) => {
        if (!selectedCustomer) return;
        const maxPoints = parseInt(selectedCustomer.points);
        let redeem = parseInt(pts);
        
        if (isNaN(redeem) || redeem < 0) redeem = 0;
        if (redeem > maxPoints) redeem = maxPoints;

        setPointsToRedeem(redeem);
        const pointVal = parseInt(settings.point_value_idr) || 500;
        setRedeemValue(redeem * pointVal);
    };

    // --- KALKULASI TOTAL ---
    const subTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let discountAmount = 0;
    if (selectedDiscount) {
        if (selectedDiscount.type === 'percentage') discountAmount = subTotal * (parseFloat(selectedDiscount.value) / 100);
        else discountAmount = parseFloat(selectedDiscount.value);
    }
    
    const amountAfterDiscount = Math.max(0, subTotal - discountAmount);
    const serviceRate = parseFloat(settings.service_charge_rate) || 0;
    const taxRate = parseFloat(settings.tax_rate) || 0;
    
    const serviceCharge = amountAfterDiscount * (serviceRate / 100);
    const taxBase = amountAfterDiscount + serviceCharge;
    const tax = taxBase * (taxRate / 100);
    
    let grandTotal = amountAfterDiscount + serviceCharge + tax;
    grandTotal = Math.max(0, grandTotal - redeemValue);

    // ESTIMASI POIN DIDAPAT
    const estimatedPointsEarned = selectedCustomer ? Math.floor(grandTotal / (parseInt(settings.point_conversion_rate) || 10000)) : 0;

    const cash = parseFloat(cashReceived) || 0;
    const change = cash - grandTotal;
    const isSufficient = paymentMethod === 'cash' ? change >= 0 : true;

    const handlePrint = () => { window.print(); };

    // Fungsi untuk Print Bluetooth
    const handleBluetoothPrint = async (data) => {
        try {
            // Jika belum connect, coba connect dulu
            if (!BluetoothPrinter.isConnected()) {
                await BluetoothPrinter.connect();
            }
            
            // Kirim data struk (gunakan receiptData atau selectedTrx yang sudah diformat)
            // Pastikan data memiliki format yang sesuai dengan receiptData
            const dataToPrint = data || receiptData || selectedTrx;
            
            if(dataToPrint) {
                await BluetoothPrinter.printReceipt(dataToPrint);
                showAlert('success', 'Terkirim', 'Struk dikirim ke printer.');
            }
        } catch (error) {
            showAlert('error', 'Print Gagal', 'Gagal mencetak: ' + error.message);
        }
    };

    const handleCheckout = async () => {
        if (paymentMethod === 'cash' && !isSufficient) return showAlert('error', 'Uang Kurang', 'Nominal pembayaran kurang.');
        if (orderType === 'dine_in' && !selectedTable) return showAlert('error', 'Pilih Meja', 'Untuk Dine In, wajib pilih meja.');

        showLoading('Memproses...');
        try {
            const paymentStatus = paymentMethod === 'pay_later' ? 'pending' : 'paid';
            const methodToSend = paymentMethod === 'pay_later' ? 'cashier' : paymentMethod; 

            const payload = {
                customer_id: selectedCustomer ? selectedCustomer.id : null,
                customer_name: selectedCustomer ? selectedCustomer.name : (customerSearch || 'Guest'),
                total_amount: subTotal, 
                discount_amount: discountAmount + redeemValue,
                tax_amount: tax,
                service_charge: serviceCharge,
                final_amount: grandTotal, 
                payment_method: methodToSend,
                payment_status: paymentStatus, 
                table_id: orderType === 'dine_in' ? selectedTable : null,
                points_redeemed: pointsToRedeem, 
                items: cart.map(item => ({
                    id: item.id, 
                    name: item.name, 
                    qty: item.qty, 
                    price: item.price,
                    variant_id: item.variant_id,
                    variant_name: item.variant_name,
                    modifiers: item.modifiers,
                    modifiers_name: item.modifiers_name
                }))
            };
            const res = await axios.post(API_URL + 'pos/checkout', payload, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                let tableName = '';
                if (orderType === 'dine_in' && selectedTable) {
                    const tbl = tables.find(t => t.id == selectedTable);
                    if(tbl) tableName = `Meja ${tbl.table_number}`;
                } else { tableName = 'Take Away'; }

                setReceiptData({
                    invoice_no: res.data.invoice_no, cashier_name: user.name, items: cart,
                    sub_total: subTotal, discount_amount: discountAmount, 
                    redeem_value: redeemValue, points_redeemed: pointsToRedeem, 
                    service_charge: serviceCharge, tax: tax, total_amount: grandTotal,
                    payment_method: methodToSend, cash_received: paymentMethod === 'cash' ? cashReceived : null, change: paymentMethod === 'cash' ? change : 0,
                    date: new Date().toLocaleString('id-ID'), outlet_info: settings, table_name: tableName,
                    payment_status: paymentStatus,
                    customer: selectedCustomer 
                });
                
                setCart([]); clearCustomer(); setCashReceived(''); setShowPaymentModal(false); setSelectedDiscount(null); setSelectedTable(''); setPointsToRedeem(0); setRedeemValue(0);
                fetchData(); 
                hideLoading(); setShowSuccessModal(true);
            } else {
                throw new Error(res.data.message || "Transaksi gagal");
            }
        } catch (error) { 
            hideLoading(); 
            showAlert('error', 'Gagal', error.response?.data?.message || 'Transaksi gagal.'); 
        }
    };

    const filteredProducts = (products || []).filter(p => {
        const matchCat = activeCategory === 'all' || p.category_id == activeCategory;
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });
    const filteredCustomers = (customers || []).filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch)));
    const quickCashAmounts = [10000, 20000, 50000, 100000];
    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-100px)]">
            <div id="printable-receipt"><Receipt data={receiptData} ref={componentRef} /></div>
            {/* Mobile Nav & Product Grid (SAMA) */}
            <div className="lg:hidden flex bg-white border-b border-gray-200 mb-2">
                <button onClick={() => setMobileTab('menu')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${mobileTab === 'menu' ? 'text-brand-primary border-b-2 border-brand-primary bg-brand-bg/50' : 'text-gray-500'}`}><Utensils size={16}/> Menu</button>
                <button onClick={() => setMobileTab('cart')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${mobileTab === 'cart' ? 'text-brand-primary border-b-2 border-brand-primary bg-brand-bg/50' : 'text-gray-500'}`}><ShoppingCart size={16}/> Pesanan {totalItems > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{totalItems}</span>}</button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                <div className={`lg:w-2/3 flex-col gap-4 lg:gap-6 h-full ${mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'}`}>
                    <div className="space-y-3 shrink-0">
                        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-white shadow-sm outline-none" placeholder="Cari menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1"><button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${activeCategory === 'all' ? 'bg-brand-darkest text-white' : 'bg-white text-gray-500'}`}>Semua</button>{(categories || []).map(cat => (<button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${activeCategory === cat.id ? 'bg-brand-darkest text-white' : 'bg-white text-gray-500'}`}>{cat.name}</button>))}</div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 pb-20 lg:pb-0">
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredProducts.length > 0 ? filteredProducts.map(product => (
                                <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white p-3 rounded-xl shadow-sm border hover:border-brand-primary/30 cursor-pointer transition-all hover:shadow-md flex flex-col h-auto">
                                    <div className="aspect-square bg-brand-bg rounded-lg mb-2 overflow-hidden relative shrink-0">{product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                                    {(product.variants?.length > 0 || product.modifiers?.length > 0) && (
                                        <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded uppercase font-bold backdrop-blur-sm">Opsi +</div>
                                    )}
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-xs line-clamp-2 mb-1 flex-1">{product.name}</h4><p className="text-brand-primary font-bold text-sm">Rp {parseInt(product.price).toLocaleString('id-ID')}</p>
                                </div>
                            )) : (<div className="col-span-full py-10 text-center text-gray-400">Produk tidak ditemukan.</div>)}
                        </div>
                    </div>
                </div>
                
                <div className={`lg:w-1/3 bg-white rounded-3xl shadow-xl border border-gray-100 flex-col h-full overflow-hidden ${mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
                    <div className="p-5 border-b border-gray-50 bg-gray-50/50 shrink-0 space-y-4">
                        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm"><button className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${orderType === 'dine_in' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => { setOrderType('dine_in'); setSelectedTable(''); }}><Utensils size={14} /> Dine In</button><button className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${orderType === 'take_away' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => { setOrderType('take_away'); setSelectedTable(''); }}><Coffee size={14} /> Take Away</button></div>
                        {orderType === 'dine_in' && (<div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pilih Meja</label><select className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}><option value="">-- Pilih Meja --</option>{tables.map(t => (<option key={t.id} value={t.id} disabled={t.status === 'occupied'} className={t.status === 'occupied' ? 'text-red-400' : 'text-gray-700'}>{t.table_number} ({t.capacity} Pax) {t.status === 'occupied' ? '- Terisi' : ''}</option>))}</select></div>)}
                        <div className="relative" ref={customerInputRef}><div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">{selectedCustomer ? (<div className="flex-1 flex items-center gap-2"><div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">{selectedCustomer.name.charAt(0)}</div><div className="flex-1"><p className="text-sm font-bold text-gray-800">{selectedCustomer.name}</p><p className="text-[10px] text-gray-500 flex items-center gap-1"><Star size={10} className="text-yellow-500 fill-yellow-500"/> {parseInt(selectedCustomer.points)} Poin</p></div><button onClick={clearCustomer}><X size={16}/></button></div>) : (<><User size={18} className="text-gray-400" /><input type="text" placeholder="Pelanggan..." className="bg-transparent border-none text-sm w-full outline-none" value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); }} onFocus={() => setShowCustomerList(true)} /></>)}</div>{showCustomerList && !selectedCustomer && customerSearch && (<div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-48 overflow-y-auto">{filteredCustomers.length > 0 ? (filteredCustomers.map(c => (<div key={c.id} onClick={() => handleSelectCustomer(c)} className="px-4 py-3 text-sm hover:bg-brand-bg cursor-pointer border-b border-gray-50">{c.name}</div>))) : (<div className="px-4 py-3 text-sm text-gray-400 text-center">Tidak ditemukan</div>)}</div>)}</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2"><ShoppingCart size={48} className="opacity-20"/><p className="text-sm">Keranjang kosong</p></div>) : cart.map(item => (
                            <div key={item.cartItemId} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-1">{item.qty}x</div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-gray-800 text-xs line-clamp-1">{item.name}</h5>
                                    <div className="text-[10px] text-gray-500 leading-tight">
                                        {item.variant_name && <p className="text-blue-600">+ {item.variant_name}</p>}
                                        {item.modifiers_name?.map((mod, i) => <p key={i}>+ {mod}</p>)}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">@ {parseInt(item.price).toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <p className="font-bold text-brand-darkest text-sm">{(item.price * item.qty).toLocaleString()}</p>
                                    <div className="flex gap-1"><button onClick={() => updateQty(item.cartItemId, 1)} className="p-0.5 bg-green-50 text-green-600 rounded"><Plus size={10}/></button><button onClick={() => updateQty(item.cartItemId, -1)} className="p-0.5 bg-red-50 text-red-600 rounded"><Minus size={10}/></button></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 bg-brand-bg/30 border-t border-brand-accent/20 shrink-0">
                        <div className="space-y-2 mb-4 text-xs">
                            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{subTotal.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center text-gray-500 cursor-pointer hover:text-brand-primary" onClick={() => setShowDiscountModal(true)}><span className="flex items-center gap-1"><Tag size={12}/> Diskon {selectedDiscount ? `(${selectedDiscount.name})` : ''}</span><span className="text-red-500 font-medium">{discountAmount > 0 ? `- ${discountAmount.toLocaleString()}` : 'Pilih >'}</span></div>
                            {redeemValue > 0 && (<div className="flex justify-between text-purple-600"><span className="flex items-center gap-1"><Star size={10}/> Poin ({pointsToRedeem})</span><span>- {redeemValue.toLocaleString()}</span></div>)}
                            {serviceRate > 0 && (<div className="flex justify-between text-gray-500"><span>Service ({serviceRate}%)</span><span>{serviceCharge.toLocaleString()}</span></div>)}
                            <div className="flex justify-between text-gray-500"><span>Tax ({taxRate}%)</span><span>{tax.toLocaleString()}</span></div>
                            
                            {/* ESTIMASI POIN DIDAPAT (VISUAL) */}
                            {selectedCustomer && estimatedPointsEarned > 0 && (
                                <div className="flex justify-end pt-1">
                                    <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Star size={8} className="fill-yellow-600"/> +{estimatedPointsEarned} Poin
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between text-xl font-bold text-brand-darkest pt-2 border-t border-dashed"><span>Total</span><span>Rp {grandTotal.toLocaleString('id-ID')}</span></div>
                        </div>
                        <button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg disabled:opacity-50 transition-all active:scale-95">Proses Pembayaran</button>
                    </div>
                </div>
            </div>

            {/* MODAL PEMBAYARAN (SAMA + POIN INFO) */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-5 bg-brand-primary text-white text-center">
                            <h3 className="text-lg font-bold">Pembayaran</h3>
                            <p className="text-brand-accent text-xs mt-1">Total Tagihan</p>
                            <h2 className="text-3xl font-bold mt-1">Rp {grandTotal.toLocaleString('id-ID')}</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            {selectedCustomer && (
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-xs text-purple-700 font-bold flex items-center gap-1"><User size={12}/> {selectedCustomer.name}</div>
                                        <div className="text-xs text-purple-600">{parseInt(selectedCustomer.points)} Poin Tersedia</div>
                                    </div>
                                    {parseInt(selectedCustomer.points) > 0 && (
                                        <div className="flex items-center gap-2">
                                            <input type="number" placeholder="Gunakan Poin" className="w-full border border-purple-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-purple-500" value={pointsToRedeem || ''} onChange={(e) => handleRedeemPoints(e.target.value)} />
                                            <div className="text-xs font-bold text-purple-700 whitespace-nowrap">= Rp {redeemValue.toLocaleString()}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* GRID TOMBOL PEMBAYARAN & INPUT CASH */}
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setPaymentMethod('cash')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold transition-all ${paymentMethod === 'cash' ? 'border-brand-primary bg-brand-bg text-brand-primary ring-1 ring-brand-primary' : 'border-gray-200 text-gray-500'}`}><Banknote size={18} /> <span className="text-[10px]">Tunai</span></button>
                                <button onClick={() => setPaymentMethod('qris')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold transition-all ${paymentMethod === 'qris' ? 'border-brand-primary bg-brand-bg text-brand-primary ring-1 ring-brand-primary' : 'border-gray-200 text-gray-500'}`}><CreditCard size={18} /> <span className="text-[10px]">QRIS</span></button>
                                <button onClick={() => setPaymentMethod('pay_later')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold transition-all ${paymentMethod === 'pay_later' ? 'border-brand-primary bg-brand-bg text-brand-primary ring-1 ring-brand-primary' : 'border-gray-200 text-gray-500'}`}><Clock size={18} /> <span className="text-[10px]">Pay Later</span></button>
                            </div>

                            {paymentMethod === 'cash' && (
                                <div>
                                    <div className="relative mb-2"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rp</span><input type="number" autoFocus className={`w-full pl-12 pr-4 py-3 text-lg font-bold border rounded-xl outline-none transition-colors ${isSufficient ? 'border-green-400 focus:ring-2 focus:ring-green-400' : 'border-red-400 focus:ring-2 focus:ring-red-400'}`} placeholder="0" value={cashReceived} onChange={e => setCashReceived(e.target.value)} /></div>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{quickCashAmounts.map(amt => (<button key={amt} onClick={() => setCashReceived(amt)} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 whitespace-nowrap">{amt.toLocaleString()}</button>))}<button onClick={() => setCashReceived(grandTotal)} className="px-3 py-1 bg-brand-bg text-brand-primary text-xs rounded-lg font-bold whitespace-nowrap">Uang Pas</button></div>
                                    <div className={`mt-3 p-3 rounded-xl flex justify-between items-center transition-colors ${isSufficient ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}><span className="text-xs font-bold uppercase">{isSufficient ? 'KEMBALIAN' : 'KURANG'}</span><span className="text-xl font-bold">Rp {Math.abs(change).toLocaleString('id-ID')}</span></div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Batal</button>
                                <button onClick={handleCheckout} disabled={paymentMethod === 'cash' && !isSufficient} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all ${paymentMethod === 'cash' && !isSufficient ? 'bg-gray-300' : 'bg-brand-primary hover:bg-brand-dark'}`}>{paymentMethod === 'pay_later' ? 'Simpan Order' : 'Bayar & Cetak'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* MODAL LAINNYA (SUKSES, DISKON, VARIANT) SAMA */}
            {showSuccessModal && (<div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center">
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
                    <h3 className="font-bold text-xl">Transaksi Berhasil!</h3>
                    <div className="mt-4 space-y-2">
                        <button onClick={handlePrint} className="w-full p-3 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200">
                            <Printer size={18}/> Print Browser (PDF)
                        </button>

                        {/* Tombol Print Bluetooth BARU */}
                        <button onClick={() => handleBluetoothPrint(receiptData)} className="w-full p-3 bg-brand-darkest text-white rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                            <Bluetooth size={18}/> Print Bluetooth
                        </button>

                        <button onClick={()=>setShowSuccessModal(false)} className="w-full p-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 mt-2">Transaksi Baru</button>
                    </div>
                </div>
            </div>)}
            {showDiscountModal && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-6"><div className="flex justify-between mb-4"><h3 className="font-bold">Pilih Promo</h3><button onClick={() => setShowDiscountModal(false)}><X size={20}/></button></div><div className="space-y-2 max-h-60 overflow-y-auto"><div onClick={() => { setSelectedDiscount(null); setShowDiscountModal(false); }} className="p-3 border rounded-xl cursor-pointer hover:bg-gray-50 text-center text-gray-500">Tanpa Diskon</div>{(discounts || []).map(d => (<div key={d.id} onClick={() => { setSelectedDiscount(d); setShowDiscountModal(false); }} className="p-3 border rounded-xl cursor-pointer hover:bg-brand-bg flex justify-between items-center"><span className="font-bold text-gray-700">{d.name}</span><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{d.type === 'percentage' ? `${parseInt(d.value)}%` : `Rp ${parseInt(d.value).toLocaleString()}`}</span></div>))}</div></div></div>)}
            {showVariantModal && selectedProductForVariant && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200"><div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"><div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800">{selectedProductForVariant.name}</h3><button onClick={() => setShowVariantModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div><div className="p-5 overflow-y-auto flex-1">{selectedProductForVariant.variants?.length > 0 && (<div className="mb-6"><h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Pilih Varian (Opsional)</h4><div className="space-y-2">{selectedProductForVariant.variants.map(v => (<label key={v.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${selectedVariant?.id === v.id ? 'border-brand-primary bg-brand-bg' : 'border-gray-200 hover:bg-gray-50'}`}><div className="flex items-center gap-3"><input type="radio" name="variant" checked={selectedVariant?.id === v.id} onChange={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)} onClick={() => { if (selectedVariant?.id === v.id) setSelectedVariant(null); }} className="accent-brand-primary w-4 h-4"/><span className={`text-sm font-medium ${selectedVariant?.id === v.id ? 'text-brand-darkest' : 'text-gray-700'}`}>{v.name}</span></div><span className="text-xs font-bold text-gray-500">{parseFloat(v.price_adjustment) > 0 ? `+${parseInt(v.price_adjustment).toLocaleString()}` : 'Free'}</span></label>))}</div></div>)}{selectedProductForVariant.modifiers?.length > 0 && (<div><h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Tambahan (Opsional)</h4><div className="space-y-2">{selectedProductForVariant.modifiers.map(m => { const isSelected = selectedModifiers.some(sm => sm.id === m.id); return (<label key={m.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${isSelected ? 'border-brand-primary bg-brand-bg' : 'border-gray-200 hover:bg-gray-50'}`}><div className="flex items-center gap-3"><input type="checkbox" checked={isSelected} onChange={(e) => { if (e.target.checked) setSelectedModifiers([...selectedModifiers, m]); else setSelectedModifiers(selectedModifiers.filter(sm => sm.id !== m.id)); }} className="accent-brand-primary w-4 h-4 rounded"/><span className={`text-sm font-medium ${isSelected ? 'text-brand-darkest' : 'text-gray-700'}`}>{m.name}</span></div><span className="text-xs font-bold text-gray-500">+{parseInt(m.price).toLocaleString()}</span></label>); })}</div></div>)}</div><div className="p-5 border-t border-gray-100 bg-gray-50"><button onClick={confirmVariantSelection} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg active:scale-95 transition-transform flex justify-between px-6"><span>Simpan Pesanan</span><span>Rp {(parseFloat(selectedProductForVariant.price) + (selectedVariant ? parseFloat(selectedVariant.price_adjustment) : 0) + selectedModifiers.reduce((sum, m) => sum + parseFloat(m.price), 0)).toLocaleString()}</span></button></div></div></div>)}
        </div>
    );
}