import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Building, Receipt, Percent, Printer, Star, Search, Gift, Image as ImageIcon, Upload, Bluetooth, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';
import { BluetoothPrinter } from '../utils/bluetoothPrinter';
import { FALLBACK_LOGO_URL, normalizeLogoUrl, withCacheBuster } from '../utils/logoUrl';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({
        name: '', phone: '', address: '', tax_rate: 0, service_charge_rate: 0, receipt_footer: '',
        point_conversion_rate: 10000, point_value_idr: 500,
        late_penalty_per_minute: 1000 // Default
    });

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [printerSize, setPrinterSize] = useState(localStorage.getItem('printerSize') || '58mm');

    const [printerName, setPrinterName] = useState('Belum Terhubung');
    const [isPrinterConnected, setIsPrinterConnected] = useState(false);

    const { showLoading, hideLoading, showAlert, setAppSettings, appSettings } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        // Tampilkan logo aktif segera saat halaman settings dibuka pertama kali.
        setLogoPreview(withCacheBuster(normalizeLogoUrl(appSettings?.logo_url || FALLBACK_LOGO_URL)));
    }, [appSettings?.logo_url]);

    useEffect(() => {
        fetchSettings();
        if (BluetoothPrinter.isConnected()) {
            setIsPrinterConnected(true);
            setPrinterName(BluetoothPrinter.device.name);
        }
    }, []);

    const fetchSettings = async () => {
        showLoading('Memuat pengaturan...');
        try {
            const res = await axios.get(API_URL + 'settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                const data = res.data.data;
                setFormData(data);
                const normalizedLogoUrl = normalizeLogoUrl(data.logo_url || appSettings?.logo_url || FALLBACK_LOGO_URL);
                setLogoPreview(withCacheBuster(normalizedLogoUrl));
                localStorage.setItem('outletSettings', JSON.stringify(data));
                setAppSettings({
                    name: data.name,
                    logo_url: normalizedLogoUrl
                });
            }
        } catch (error) { console.error(error); } finally { hideLoading(); }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => { const file = e.target.files[0]; if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); } };

    const handleSave = async (e) => {
        e.preventDefault();
        showLoading('Menyimpan...');
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            if (logoFile) data.append('logo', logoFile);

            const res = await axios.post(API_URL + 'settings', data, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                const newData = res.data.data;
                localStorage.setItem('outletSettings', JSON.stringify(newData));
                localStorage.setItem('printerSize', printerSize);
                const normalizedLogoUrl = normalizeLogoUrl(newData.logo_url || FALLBACK_LOGO_URL);
                setAppSettings({ name: newData.name, logo_url: normalizedLogoUrl });
                setLogoPreview(withCacheBuster(normalizedLogoUrl));
                setLogoFile(null);
                showAlert('success', 'Berhasil', 'Pengaturan disimpan');
            }
        } catch (error) { showAlert('error', 'Gagal', 'Gagal menyimpan'); } finally { hideLoading(); }
    };

    const handleConnectPrinter = async () => {
        try {
            const name = await BluetoothPrinter.connect();
            setPrinterName(name);
            setIsPrinterConnected(true);
            showAlert('success', 'Terhubung', `Printer ${name} siap digunakan.`);
        } catch (error) {
            showAlert('error', 'Gagal Koneksi', 'Pastikan Bluetooth aktif dan browser mendukung Web Bluetooth (Chrome).');
        }
    };

    const handleTestPrint = async () => {
        if (!isPrinterConnected) return showAlert('error', 'Error', 'Printer belum terhubung.');
        try {
            const dummyData = {
                invoice_no: 'TEST-001',
                date: new Date().toLocaleString(),
                cashier_name: 'Admin Test',
                outlet_info: formData,
                items: [{ name: 'Test Item A', qty: 1, price: 10000 }, { name: 'Test Item B', qty: 2, price: 5000 }],
                sub_total: 20000, total_amount: 20000, payment_method: 'cash'
            };
            await BluetoothPrinter.printReceipt(dummyData);
            showAlert('success', 'Terkirim', 'Data dikirim ke printer.');
        } catch (error) {
            showAlert('error', 'Gagal Print', error.message);
            setIsPrinterConnected(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div><h3 className="text-brand-darkest font-bold text-2xl">Pengaturan Toko</h3><p className="text-gray-500 text-sm">Atur profil dan perangkat keras.</p></div>
                {activeTab === 'general' && (
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg active:scale-95"><Save size={20} /> Simpan Perubahan</button>
                )}
            </div>

            {/* TABS */}
            <div className="flex gap-2 border-b border-gray-200 pb-1">
                <button onClick={() => setActiveTab('general')} className={`px-6 py-2 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'general' ? 'bg-white text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>Umum</button>
                <button onClick={() => setActiveTab('hardware')} className={`px-6 py-2 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'hardware' ? 'bg-white text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>Hardware & Printer</button>
            </div>

            {activeTab === 'general' ? (
                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 flex flex-col items-center">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 w-full"><ImageIcon size={20} className="text-brand-primary" /> Logo Outlet</h4>
                        <div className="w-40 h-40 bg-gray-50 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group transition-all hover:border-brand-primary bg-white">{logoPreview ? (<img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.onerror = null; const fallback = withCacheBuster(FALLBACK_LOGO_URL); e.currentTarget.src = fallback; setLogoPreview(fallback); }} />) : (<div className="text-center text-gray-400"><Upload size={32} className="mx-auto mb-2 opacity-50" /><span className="text-xs font-medium">Upload Logo</span></div>)}<input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold text-sm z-0">Ganti Logo</div></div>
                        <div className="mt-3 text-xs font-semibold">
                            {logoFile ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Preview logo baru (belum disimpan)</span>
                            ) : (logoPreview && !logoPreview.includes(FALLBACK_LOGO_URL.split('?')[0]) ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Logo aktif saat ini</span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">Logo default aktif</span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 lg:col-span-2">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Building size={20} className="text-brand-primary" /> Profil Outlet</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Restoran</label><input type="text" name="name" required className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" value={formData.name} onChange={handleChange} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor Telepon</label><input type="text" name="phone" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" value={formData.phone} onChange={handleChange} /></div></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat Lengkap</label><textarea name="address" rows="3" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" value={formData.address} onChange={handleChange}></textarea></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 lg:col-span-3">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Percent size={20} className="text-brand-primary" /> Keuangan & HR</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pajak (PPN) %</label><input type="number" name="tax_rate" step="0.01" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" value={formData.tax_rate} onChange={handleChange} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Charge %</label><input type="number" name="service_charge_rate" step="0.01" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" value={formData.service_charge_rate} onChange={handleChange} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Belanja Per 1 Poin (Rp)</label><input type="number" name="point_conversion_rate" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" value={formData.point_conversion_rate} onChange={handleChange} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nilai 1 Poin (Rp)</label><input type="number" name="point_value_idr" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" value={formData.point_value_idr} onChange={handleChange} /></div>
                        </div>

                        {/* SECTION DENDA KETERLAMBATAN */}
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <label className="block text-xs font-bold text-red-500 uppercase mb-1 flex items-center gap-1"><Clock size={14} /> Denda Keterlambatan (Per Menit)</label>
                            <div className="relative max-w-xs">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                                <input
                                    type="number" name="late_penalty_per_minute"
                                    className="w-full border border-red-100 bg-red-50 rounded-xl pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-red-500 text-red-700 font-bold"
                                    value={formData.late_penalty_per_minute} onChange={handleChange}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Dipotong otomatis dari gaji jika karyawan absen terlambat dari jam shift.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan Kaki Struk</label><input type="text" name="receipt_footer" className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" value={formData.receipt_footer} onChange={handleChange} /></div></div>
                    </div>
                </form>
            ) : (
                // --- TAB HARDWARE ---
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Printer size={20} className="text-brand-primary" /> Pengaturan Printer Bluetooth
                    </h4>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3 items-start">
                        <AlertTriangle className="text-blue-600 shrink-0" size={20} />
                        <div className="text-sm text-blue-800">
                            <p className="font-bold">Petunjuk Penggunaan:</p>
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                <li>Fitur ini menggunakan <b>Web Bluetooth API</b> yang hanya didukung oleh browser <b>Google Chrome</b> (Android/Desktop).</li>
                                <li>Pastikan Bluetooth perangkat Anda menyala dan printer sudah di-pairing sebelumnya (di pengaturan HP).</li>
                                <li>Saat klik "Cari Printer", pilih printer thermal Anda dari daftar.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                        <div className={`p-4 rounded-full mb-4 transition-colors ${isPrinterConnected ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                            <Bluetooth size={48} />
                        </div>

                        <h5 className="font-bold text-lg text-gray-800 mb-1">{printerName}</h5>
                        <p className={`text-sm font-medium mb-6 ${isPrinterConnected ? 'text-green-600' : 'text-red-500'}`}>
                            Status: {isPrinterConnected ? 'Terhubung' : 'Terputus'}
                        </p>

                        <div className="flex gap-4">
                            {!isPrinterConnected ? (
                                <button
                                    onClick={handleConnectPrinter}
                                    className="px-6 py-2 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark active:scale-95 transition-transform flex items-center gap-2"
                                >
                                    <Search size={18} /> Cari & Hubungkan
                                </button>
                            ) : (
                                <button
                                    onClick={handleTestPrint}
                                    className="px-6 py-2 bg-gray-800 text-white font-bold rounded-xl shadow-lg hover:bg-gray-900 active:scale-95 transition-transform flex items-center gap-2"
                                >
                                    <Printer size={18} /> Test Print Struk
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ukuran Kertas</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 border rounded-xl p-3 cursor-pointer flex items-center gap-3 transition-all ${printerSize === '58mm' ? 'border-brand-primary bg-brand-bg text-brand-darkest ring-1 ring-brand-primary' : 'border-gray-200'}`}>
                                <input type="radio" name="printer" value="58mm" checked={printerSize === '58mm'} onChange={(e) => setPrinterSize(e.target.value)} className="accent-brand-primary w-4 h-4" />
                                <span className="font-bold text-sm">58mm (Standard Mobile)</span>
                            </label>
                            <label className={`flex-1 border rounded-xl p-3 cursor-pointer flex items-center gap-3 transition-all ${printerSize === '80mm' ? 'border-brand-primary bg-brand-bg text-brand-darkest ring-1 ring-brand-primary' : 'border-gray-200'}`}>
                                <input type="radio" name="printer" value="80mm" checked={printerSize === '80mm'} onChange={(e) => setPrinterSize(e.target.value)} className="accent-brand-primary w-4 h-4" />
                                <span className="font-bold text-sm">80mm (Standard Desktop)</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}