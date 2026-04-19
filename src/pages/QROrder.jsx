import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, CheckCircle, X, User, Mail, Phone, CreditCard, ChevronRight, Store, Clock, Receipt, Loader2, Banknote, QrCode, Copy, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';

export default function QROrder() {
    const [searchParams] = useSearchParams();
    const tableId = searchParams.get('table_id');
    const navigate = useNavigate();
    
    const [outlet, setOutlet] = useState(null);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCat, setActiveCat] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    
    // Form Data State
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [formErrors, setFormErrors] = useState({}); // Untuk validasi UI merah
    
    const [paymentMethod, setPaymentMethod] = useState('online'); 
    const [orderStatus, setOrderStatus] = useState('idle'); 
    const [trxResult, setTrxResult] = useState(null); 
    const [qrImage, setQrImage] = useState(null);

    // Variant Modal State
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedModifiers, setSelectedModifiers] = useState([]);

    useEffect(() => {
        fetchMenu();
    }, []);

    // Polling Status Transaksi (Auto-Check Pembayaran)
    useEffect(() => {
        let interval;
        if (orderStatus === 'waiting_payment' && trxResult?.invoice) {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_URL}public/status&invoice=${trxResult.invoice}`);
                    if (res.data.status && res.data.data.payment_status === 'paid') {
                        setOrderStatus('success');
                        clearInterval(interval);
                    }
                } catch (error) {
                    console.error("Gagal cek status:", error);
                }
            }, 3000); 
        }
        return () => clearInterval(interval);
    }, [orderStatus, trxResult]);

    const fetchMenu = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(API_URL + 'public/menu');
            if (res.data.status) {
                setOutlet(res.data.data.outlet);
                setCategories(res.data.data.categories);
                setProducts(res.data.data.products);
            }
        } catch (error) {
            console.error("Gagal memuat menu", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- LOGIC CART & VARIANT ---
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

    // --- CALCULATIONS ---
    const subTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
    const serviceRate = parseFloat(outlet?.service_charge_rate ?? 0);
    const taxRate = parseFloat(outlet?.tax_rate ?? 0);
    
    const serviceCharge = subTotal * (serviceRate / 100);
    const taxAmount = (subTotal + serviceCharge) * (taxRate / 100);
    const grandTotal = subTotal + serviceCharge + taxAmount;
    const cartTotalQty = cart.reduce((acc, item) => acc + item.qty, 0);

    // --- UTILS ---
    const handleCopyLink = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); alert('Link disalin!'); } catch (err) {}
        document.body.removeChild(textArea);
    };

    // --- CHECKOUT PROCESS ---
    const handleCheckout = async (e) => {
        e.preventDefault();
        
        // 1. Validasi Wajib
        const errors = {};
        if (!formData.name.trim()) errors.name = true;
        if (!formData.phone.trim()) errors.phone = true;
        if (!formData.email.trim()) errors.email = true; // Email Wajib
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            alert("Mohon lengkapi Nama, Email, dan WhatsApp.");
            return;
        }

        setOrderStatus('processing');
        try {
            const payload = {
                outlet_id: 1,
                table_id: tableId,
                customer_name: formData.name,
                customer_email: formData.email,
                customer_phone: formData.phone,
                total_amount: subTotal,
                tax_amount: taxAmount,
                service_charge: serviceCharge,
                final_amount: Math.round(grandTotal),
                payment_method: paymentMethod === 'online' ? 'qris' : 'pay_later', 
                items: cart.map(item => ({
                    id: item.id, name: item.name, qty: item.qty, price: item.price,
                    variant_id: item.variant_id, variant_name: item.variant_name,
                    modifiers: item.modifiers, modifiers_name: item.modifiers_name
                }))
            };

            const res = await axios.post(API_URL + 'public/order', payload);
            
            if (res.data.status) {
                if (res.data.payment_type === 'qris_display' && res.data.qr_url) {
                    setQrImage(res.data.qr_url);
                    setTrxResult({ invoice: res.data.invoice_no, total: Math.round(grandTotal) });
                    setOrderStatus('waiting_payment');
                    setShowCart(false);
                } else if (res.data.payment_type === 'pay_later') {
                    finishTransaction(res.data.invoice_no, 'pay_later');
                }
            } else {
                alert("Gagal: " + res.data.message);
                setOrderStatus('idle');
            }
        } catch (error) {
            console.error(error);
            alert("Koneksi gagal. Coba lagi.");
            setOrderStatus('idle');
        }
    };

    const finishTransaction = (invoiceNo, status) => {
        setTrxResult({ 
            items: cart, 
            totals: { subTotal, service: serviceCharge, tax: taxAmount, finalTotal: Math.round(grandTotal), serviceRate, taxRate }, 
            customer: formData, invoice: invoiceNo, status: status 
        });
        setOrderStatus('success');
        setCart([]);
        setShowCart(false);
    };

    const filteredProducts = activeCat === 'all' ? products : products.filter(p => p.category_id == activeCat);

    // --- SCREEN: PEMBAYARAN QR (BRANDED) ---
    if (orderStatus === 'waiting_payment') {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-center animate-in zoom-in duration-300 relative border border-gray-200">
                    {/* Header Merah Taskora */}
                    <div className="bg-brand-primary p-6 text-white relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-20" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                        <QrCode className="w-12 h-12 mx-auto mb-2 opacity-90 relative z-10"/>
                        <h2 className="text-xl font-bold relative z-10">Scan QRIS</h2>
                        <p className="text-sm text-red-100 relative z-10">Selesaikan pembayaran Anda</p>
                    </div>
                    
                    <div className="p-8 flex flex-col items-center">
                        {/* Area QR Code */}
                        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 mb-6 relative group">
                            {qrImage ? (
                                <img src={qrImage} alt="QRIS Code" className="w-64 h-64 object-contain mix-blend-multiply" />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center bg-gray-50 text-gray-400">Loading QR...</div>
                            )}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-3 py-1 rounded-full shadow-md font-bold">
                                SCAN ME
                            </div>
                        </div>
                        
                        {/* Link Pembayaran */}
                        <div className="w-full mb-6 text-left bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2">
                                <code className="text-[10px] text-gray-500 break-all flex-1 font-mono leading-tight bg-white p-2 rounded border border-gray-100 block truncate">
                                    {qrImage}
                                </code>
                                <button 
                                    onClick={() => handleCopyLink(qrImage)}
                                    className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-brand-primary hover:border-brand-primary transition-all shadow-sm shrink-0"
                                    title="Salin Link"
                                >
                                    <Copy size={18}/>
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                Jika QR tidak muncul, salin link dan buka di browser.
                            </p>
                        </div>

                        {/* Total & Status */}
                        <div className="space-y-1 mb-6">
                            <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total Tagihan</p>
                            <p className="text-3xl font-black text-brand-darkest">Rp {trxResult?.total?.toLocaleString('id-ID')}</p>
                        </div>

                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-5 py-2.5 rounded-full text-sm font-bold animate-pulse border border-orange-100">
                            <Loader2 size={18} className="animate-spin"/> Menunggu Pembayaran Otomatis...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- SCREEN: SUKSES (BRANDED) ---
    if (orderStatus === 'success') {
        setTimeout(() => { navigate(`/order-status?invoice=${trxResult.invoice}`); }, 2000);

        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-3xl shadow-xl text-center animate-in zoom-in duration-500 max-w-sm w-full border border-white/50">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-brand-darkest mb-2">Pembayaran Berhasil!</h2>
                    <p className="text-gray-500 text-sm">Pesanan Anda segera diproses dapur.</p>
                    <div className="mt-8">
                        <Loader2 className="animate-spin mx-auto text-brand-primary" />
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center animate-pulse">
                    <Store className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-gray-400 font-medium">Memuat Menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-28 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-gray-200">
            
            {/* HEADER Sticky */}
            <div className="bg-white sticky top-0 z-20 shadow-sm">
                <div className="p-4">
                    <div className="flex justify-between items-center mb-1">
                        <div>
                            <h1 className="font-bold text-xl text-gray-900">{outlet?.name || 'Resto Menu'}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${tableId ? 'bg-brand-primary text-white' : 'bg-orange-100 text-orange-600'}`}>
                                    {tableId ? <Store size={10}/> : <ShoppingBag size={10}/>}
                                    {tableId ? `Meja ${tableId}` : 'Take Away'}
                                </span>
                                <span className="text-[10px] text-gray-400">• Buka 24 Jam</span>
                            </div>
                        </div>
                        <div className="relative cursor-pointer p-2 hover:bg-gray-50 rounded-full transition-colors" onClick={() => setShowCart(true)}>
                            <ShoppingCart className="text-gray-700" size={24} />
                            {cartTotalQty > 0 && (
                                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold ring-2 ring-white animate-bounce-in shadow-sm border border-white">
                                    {cartTotalQty}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
                    <button onClick={() => setActiveCat('all')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeCat === 'all' ? 'bg-brand-darkest text-white border-brand-darkest' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Semua</button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeCat === cat.id ? 'bg-brand-darkest text-white border-brand-darkest' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{cat.name}</button>
                    ))}
                </div>
            </div>

            {/* PRODUCT GRID */}
            <div className="p-4 space-y-4">
                {filteredProducts.map(prod => (
                    <div key={prod.id} onClick={() => handleProductClick(prod)} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex gap-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-28 h-28 bg-gray-100 rounded-xl shrink-0 overflow-hidden relative">
                            {prod.image ? <img src={prod.image} className="w-full h-full object-cover" alt={prod.name} /> : <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50"><Store size={32} /></div>}
                            {(prod.variants?.length > 0 || prod.modifiers?.length > 0) && (
                                <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">Opsi +</div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <h3 className="font-bold text-gray-800 text-base line-clamp-2 leading-tight mb-1">{prod.name}</h3>
                                <p className="text-xs text-gray-400 line-clamp-2">{prod.description || 'Rasa otentik.'}</p>
                            </div>
                            <div className="flex justify-between items-end mt-3">
                                <span className="font-bold text-brand-primary">Rp {parseInt(prod.price).toLocaleString()}</span>
                                <button className="bg-brand-darkest text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-gray-200 active:scale-95 transition-transform">+ Pesan</button>
                            </div>
                        </div>
                    </div>
                ))}
                <div className="h-20"></div>
            </div>

            {/* FLOATING CHECKOUT BAR */}
            {cartTotalQty > 0 && !showCart && (
                <div className="fixed bottom-6 left-4 right-4 max-w-[410px] mx-auto z-30">
                    <button onClick={() => setShowCart(true)} className="w-full bg-brand-darkest text-white p-4 rounded-2xl shadow-2xl shadow-gray-400/50 flex justify-between items-center font-bold animate-bounce-in active:scale-95 transition-transform">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold backdrop-blur-sm border border-white/30">{cartTotalQty}</div>
                            <div className="flex flex-col items-start"><span className="text-xs text-gray-300 font-normal">Total Estimasi</span><span className="text-lg">Rp {subTotal.toLocaleString()}</span></div>
                        </div>
                        <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md">Lihat Pesanan <ChevronRight size={16}/></div>
                    </button>
                </div>
            )}

            {/* CART MODAL - BRANDED UI */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setShowCart(false)}></div>
                    <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-10 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 pb-2 flex justify-between items-center border-b border-gray-50 shrink-0">
                            <h2 className="font-bold text-xl text-brand-darkest">Detail Pesanan</h2>
                            <button onClick={() => setShowCart(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 p-6 space-y-4">
                            {cart.length === 0 ? (<div className="text-center py-10"><ShoppingCart className="w-12 h-12 mx-auto text-gray-200 mb-2" /><p className="text-gray-400">Keranjang masih kosong.</p></div>) : cart.map(item => (
                                <div key={item.cartItemId} className="flex justify-between items-start pb-4 border-b border-gray-50 last:border-none">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800 text-sm mb-1">{item.name}</p>
                                        <div className="text-[10px] text-gray-500 leading-tight mb-1">
                                            {item.variant_name && <span className="block text-brand-primary">+ {item.variant_name}</span>}
                                            {item.modifiers_name?.map((mod, i) => <span key={i} className="block">+ {mod}</span>)}
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">Rp {parseInt(item.price).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                        <button onClick={() => updateQty(item.cartItemId, -1)} className="w-7 h-7 bg-white shadow rounded-md flex items-center justify-center text-gray-600"><Minus size={12}/></button>
                                        <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                                        <button onClick={() => updateQty(item.cartItemId, 1)} className="w-7 h-7 bg-brand-darkest text-white shadow rounded-md flex items-center justify-center"><Plus size={12}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* FORM & PAYMENT */}
                        {cart.length > 0 && (
                            <div className="p-6 bg-brand-bg rounded-t-3xl shadow-inner space-y-4 shrink-0 border-t border-brand-primary/10">
                                <div>
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-brand-primary uppercase tracking-wide">
                                        <ShieldCheck size={14} /> Data Pemesan (Wajib Isi)
                                    </div>
                                    <div className="space-y-3 bg-white p-4 rounded-xl border border-white shadow-sm">
                                        
                                        {/* NAMA */}
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                            <input 
                                                type="text" placeholder="Nama Lengkap" 
                                                className={`w-full bg-gray-50 border ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-100'} rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary`}
                                                value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); setFormErrors({...formErrors, name: false}); }}
                                            />
                                        </div>
                                        
                                        {/* KONTAK ROW */}
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                                <input 
                                                    type="tel" placeholder="WhatsApp" 
                                                    className={`w-full bg-gray-50 border ${formErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-100'} rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary`}
                                                    value={formData.phone} onChange={e => { setFormData({...formData, phone: e.target.value}); setFormErrors({...formErrors, phone: false}); }}
                                                />
                                            </div>
                                            <div className="relative flex-1">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                                <input 
                                                    type="email" placeholder="Email" 
                                                    className={`w-full bg-gray-50 border ${formErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-100'} rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary`}
                                                    value={formData.email} onChange={e => { setFormData({...formData, email: e.target.value}); setFormErrors({...formErrors, email: false}); }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 pt-2 border-t border-brand-primary/10 text-sm text-gray-600">
                                    <div className="flex justify-between"><span>Subtotal</span><span>Rp {subTotal.toLocaleString()}</span></div>
                                    {serviceCharge > 0 && (<div className="flex justify-between text-xs"><span>Service ({serviceRate}%)</span><span>Rp {serviceCharge.toLocaleString()}</span></div>)}
                                    {taxAmount > 0 && (<div className="flex justify-between text-xs"><span>Pajak ({taxRate}%)</span><span>Rp {taxAmount.toLocaleString()}</span></div>)}
                                </div>
                                
                                {/* PILIHAN PEMBAYARAN */}
                                <div className="flex justify-between gap-3 pt-2">
                                    <button 
                                        onClick={() => setPaymentMethod('online')}
                                        className={`flex-1 py-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${paymentMethod === 'online' ? 'bg-brand-primary text-white border-brand-primary shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-200'}`}
                                    >
                                        <QrCode size={20}/> Bayar QRIS
                                    </button>
                                    <button 
                                        onClick={() => setPaymentMethod('later')}
                                        className={`flex-1 py-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${paymentMethod === 'later' ? 'bg-brand-darkest text-white border-brand-darkest shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-200'}`}
                                    >
                                        <Banknote size={20}/> Bayar di Kasir
                                    </button>
                                </div>

                                <div className="flex justify-between items-end pt-2 border-t border-brand-primary/10">
                                    <div><p className="text-xs text-gray-500 mb-1 font-bold uppercase">Total Tagihan</p><p className="text-2xl font-black text-brand-darkest">Rp {Math.round(grandTotal).toLocaleString()}</p></div>
                                    <button onClick={handleCheckout} disabled={orderStatus === 'processing'} className="px-8 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-transform hover:bg-brand-dark">
                                        {orderStatus === 'processing' ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle size={20} />}
                                        {orderStatus === 'processing' ? 'Proses...' : 'Pesan'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL VARIANT & MODIFIER (SAMA - Tampilan dirapikan dikit) */}
            {showVariantModal && selectedProductForVariant && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">{selectedProductForVariant.name}</h3>
                            <button onClick={() => setShowVariantModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            {selectedProductForVariant.variants?.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Pilih Varian (Opsional)</h4>
                                    <div className="space-y-2">{selectedProductForVariant.variants.map(v => (
                                        <label key={v.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${selectedVariant?.id === v.id ? 'border-brand-primary bg-brand-bg text-brand-darkest' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="radio" 
                                                    name="variant" 
                                                    checked={selectedVariant?.id === v.id} 
                                                    onChange={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                                                    onClick={() => { if (selectedVariant?.id === v.id) setSelectedVariant(null); }}
                                                    className="accent-brand-primary w-4 h-4"
                                                />
                                                <span className="text-sm font-medium">{v.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500">{parseFloat(v.price_adjustment) > 0 ? `+${parseInt(v.price_adjustment).toLocaleString()}` : 'Free'}</span>
                                        </label>
                                    ))}</div>
                                </div>
                            )}
                            {selectedProductForVariant.modifiers?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Tambahan (Opsional)</h4>
                                    <div className="space-y-2">{selectedProductForVariant.modifiers.map(m => {
                                        const isSelected = selectedModifiers.some(sm => sm.id === m.id);
                                        return (
                                            <label key={m.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${isSelected ? 'border-brand-primary bg-brand-bg text-brand-darkest' : 'border-gray-200 hover:bg-gray-50'}`}><div className="flex items-center gap-3"><input type="checkbox" checked={isSelected} onChange={(e) => { if (e.target.checked) setSelectedModifiers([...selectedModifiers, m]); else setSelectedModifiers(selectedModifiers.filter(sm => sm.id !== m.id)); }} className="accent-brand-primary w-4 h-4 rounded"/><span className="text-sm font-medium">{m.name}</span></div><span className="text-xs font-bold text-gray-500">+{parseInt(m.price).toLocaleString()}</span></label>
                                        );
                                    })}</div>
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-gray-50">
                            <button onClick={confirmVariantSelection} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg active:scale-95 transition-transform flex justify-between px-6">
                                <span>Simpan Pesanan</span>
                                <span>Rp {(parseFloat(selectedProductForVariant.price) + (selectedVariant ? parseFloat(selectedVariant.price_adjustment) : 0) + selectedModifiers.reduce((sum, m) => sum + parseFloat(m.price), 0)).toLocaleString()}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}