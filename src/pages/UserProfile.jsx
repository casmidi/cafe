import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Key, Camera, DollarSign, ShieldCheck, AlertTriangle, CheckCircle, Loader2, X, Clock, FileText, Download, Printer, Mail } from 'lucide-react';
import * as faceapi from 'face-api.js';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function UserProfile() {
    const [user, setUser] = useState(null);
    const [payrolls, setPayrolls] = useState([]);
    const [lateLogs, setLateLogs] = useState([]);
    
    const [activeTab, setActiveTab] = useState('profile'); 
    
    // Face ID State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [faceRegistered, setFaceRegistered] = useState(false);

    // Password Form
    const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

    // State untuk Modal Slip Gaji
    const [showSlipModal, setShowSlipModal] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [settings, setSettings] = useState({}); 
    
    const videoRef = useRef();
    const { showLoading, hideLoading, showAlert } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchProfile();
        fetchSettings(); 
        loadModels();
    }, []);

    useEffect(() => {
        if (activeTab === 'payroll') fetchPayrolls();
        if (activeTab === 'late') fetchLateHistory();
    }, [activeTab]);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(API_URL + 'auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setUser(res.data.data);
                if (res.data.data.has_face_id) {
                    setFaceRegistered(true);
                }
            }
        } catch (error) { console.error(error); }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get(API_URL + 'settings', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                setSettings(res.data.data);
            }
        } catch (error) { console.error(error); }
    };

    const loadModels = async () => {
        const MODEL_URL = '/models';
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setIsModelLoaded(true);
        } catch (e) { console.error("Error loading models", e); }
    };

    const startCamera = () => {
        setIsCameraOpen(true);
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then(stream => { if(videoRef.current) videoRef.current.srcObject = stream; })
            .catch(() => {
                showAlert('error', 'Error', 'Gagal akses kamera');
                setIsCameraOpen(false);
            });
    };

    const handleRegisterFace = async () => {
        if (!videoRef.current) return;
        setIsProcessing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();
            
            if (!detections.length) throw new Error("Wajah tidak terdeteksi.");
            if (detections.length > 1) throw new Error("Terdeteksi lebih dari 1 wajah.");

            const descriptor = Array.from(detections[0].descriptor); 

            const res = await axios.post(API_URL + 'users/register-face', {
                face_descriptor: descriptor
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                showAlert('success', 'Berhasil', 'Wajah berhasil didaftarkan!');
                setIsCameraOpen(false);
                setFaceRegistered(true); 
                const stream = videoRef.current.srcObject;
                if (stream) stream.getTracks().forEach(t => t.stop());
                fetchProfile();
            }
        } catch (error) {
            showAlert('error', 'Gagal', error.response?.data?.message || error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) return showAlert('error', 'Gagal', 'Konfirmasi password tidak cocok.');
        showAlert('info', 'Info', 'Hubungi admin untuk reset password.');
    };

    // --- DATA FETCHERS ---
    const fetchPayrolls = async () => {
        showLoading('Memuat Gaji...');
        try {
            const res = await axios.get(`${API_URL}payroll/list&period=${new Date().toISOString().slice(0, 7)}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                const myData = res.data.data.filter(p => p.user_id == user.id);
                setPayrolls(myData);
            }
        } catch (e) { console.error(e); } finally { hideLoading(); }
    };

    const fetchLateHistory = async () => {
        showLoading('Memuat Data...');
        try {
            const res = await axios.get(API_URL + 'attendance/history', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                const lates = res.data.data.filter(a => a.status === 'late');
                setLateLogs(lates);
            }
        } catch (e) { console.error(e); } finally { hideLoading(); }
    };

    const openSlip = (payroll) => {
        setSelectedPayroll(payroll);
        setShowSlipModal(true);
    };

    const handlePrintSlip = () => {
        window.print();
    };

    const Payslip = ({ data }) => {
        if (!data) return null;
        const fmt = (num) => parseInt(num || 0).toLocaleString('id-ID');

        return (
            <div id="printable-slip" className="p-8 bg-white text-gray-800 font-sans max-w-2xl mx-auto border border-gray-200 shadow-sm print:shadow-none print:border-none">
                {/* HEADER */}
                <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-6 h-24">
                    <div className="flex items-center h-full">
                        {settings.logo_url ? (
                            <img src={settings.logo_url} alt="Logo" className="h-full w-auto object-contain grayscale" />
                        ) : (
                            <h2 className="text-3xl font-bold uppercase tracking-wider text-gray-900">{settings.name || 'COMPANY'}</h2>
                        )}
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-bold text-gray-400 tracking-widest">SLIP GAJI</h1>
                        <p className="font-mono font-bold text-lg mt-1">{data.period_month}</p>
                    </div>
                </div>

                {/* INFO */}
                <div className="grid grid-cols-2 gap-8 mb-8 text-sm border-b border-dashed border-gray-300 pb-6">
                    <div>
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Karyawan</p>
                        <p className="font-bold text-xl text-gray-900">{data.employee_name}</p>
                        <p className="text-gray-500 mt-1 font-mono">ID: #{data.user_id.toString().padStart(4, '0')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Tanggal Cetak</p>
                        <p className="font-bold text-lg">{new Date().toLocaleDateString('id-ID')}</p>
                    </div>
                </div>

                {/* RINCIAN */}
                <div className="grid grid-cols-2 gap-x-16 gap-y-4 mb-8">
                    {/* PENDAPATAN */}
                    <div>
                        <h4 className="font-bold border-b-2 border-gray-100 pb-2 mb-3 text-xs uppercase tracking-wider text-gray-500">Pendapatan</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Gaji Pokok</span>
                                <span className="font-bold text-gray-900">Rp {fmt(data.base_salary)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Bonus / Insentif</span>
                                <span className="font-medium text-gray-900">Rp {fmt(data.bonus_sales)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tunjangan</span>
                                <span className="font-medium text-gray-900">Rp {fmt(data.total_allowance)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Lembur</span>
                                <span className="font-medium text-gray-900">Rp {fmt(data.overtime_pay)}</span>
                            </div>
                        </div>
                    </div>

                    {/* POTONGAN */}
                    <div>
                        <h4 className="font-bold border-b-2 border-gray-100 pb-2 mb-3 text-xs uppercase tracking-wider text-red-500">Potongan</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Denda Terlambat</span>
                                <span className="font-medium text-red-500">(Rp {fmt(data.late_penalty)})</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">PPh 21</span>
                                <span className="font-medium text-red-500">(Rp {fmt(data.tax_amount)})</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">BPJS</span>
                                <span className="font-medium text-red-500">(Rp {fmt(data.bpjs_amount)})</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Kasbon / Lainnya</span>
                                <span className="font-medium text-red-500">(Rp {fmt(data.total_deduction)})</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TOTAL */}
                <div className="bg-gray-900 text-white p-6 rounded-xl flex justify-between items-center shadow-lg print:bg-gray-800 print:text-white print:shadow-none">
                    <div>
                        <p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1">TAKE HOME PAY</p>
                        <p className="text-xs opacity-50">Gaji Bersih Diterima</p>
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight">Rp {fmt(data.net_salary)}</h2>
                </div>

                <div className="mt-20 pt-8 border-t border-gray-200 flex justify-between text-xs text-center text-gray-500">
                    <div className="w-40">
                        <p className="mb-20">Penerima,</p>
                        <p className="font-bold border-t border-gray-300 pt-2 text-gray-900">{data.employee_name}</p>
                    </div>
                    <div className="w-40">
                        <p className="mb-20">Manager,</p>
                        <p className="font-bold border-t border-gray-300 pt-2 text-gray-900">Authorized Signature</p>
                    </div>
                </div>
            </div>
        );
    };

    if (!user) return <div className="p-10 text-center text-gray-500">Memuat profil...</div>;

    return (
        <div className="space-y-6 pb-20">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-slip, #printable-slip * { visibility: visible; }
                    #printable-slip { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 40px; border: none; }
                    @page { margin: 0; size: auto; }
                }
            `}</style>

            <div className="flex justify-between items-center">
                <h3 className="text-brand-darkest font-bold text-2xl">Profil Saya</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* INFO KIRI */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-24 h-24 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary font-bold text-4xl mb-3 relative">
                            {user.name?.charAt(0).toUpperCase()}
                            {faceRegistered && <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full border-2 border-white shadow-sm"><CheckCircle size={16}/></div>}
                        </div>
                        <h4 className="font-bold text-xl text-gray-800">{user.name}</h4>
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full mt-1 capitalize">{user.role}</span>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Username</p>
                            <p className="font-medium text-gray-800">{user.username}</p>
                        </div>
                        {user.email && (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Email</p>
                                <p className="font-medium text-gray-800">{user.email}</p>
                            </div>
                        )}
                        {user.shift_start && (
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-blue-600 text-xs uppercase font-bold mb-1 flex items-center gap-1"><Clock size={12}/> Shift Kerja</p>
                                <p className="font-medium text-blue-900">{user.shift_start.slice(0,5)} - {user.shift_end.slice(0,5)}</p>
                            </div>
                        )}
                        <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-green-600 text-xs uppercase font-bold mb-1 flex items-center gap-1"><DollarSign size={12}/> Gaji Pokok</p>
                            <p className="font-medium text-green-900">Rp {parseInt(user.base_salary || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* TABS KANAN */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 w-fit overflow-x-auto">
                        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}><ShieldCheck size={16}/> Keamanan</button>
                        <button onClick={() => setActiveTab('payroll')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'payroll' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}><DollarSign size={16}/> Slip Gaji</button>
                        <button onClick={() => setActiveTab('late')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'late' ? 'bg-brand-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}><AlertTriangle size={16}/> Keterlambatan</button>
                    </div>

                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            {/* FACE ID REGISTRATION */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Camera size={20} className="text-brand-primary"/> Registrasi Wajah (Face ID)</h4>
                                
                                {faceRegistered ? (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                                        <h5 className="font-bold text-green-800 text-lg">Wajah Sudah Terdaftar</h5>
                                        <p className="text-green-600 text-sm mt-1">Akun Anda sudah terlindungi dengan Face ID. Pendaftaran ulang tidak diizinkan demi keamanan.</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-500 mb-4">Daftarkan wajah Anda untuk absensi. Pastikan wajah terlihat jelas dan pencahayaan cukup.</p>
                                        
                                        {isCameraOpen ? (
                                            <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4 shadow-inner mx-auto max-w-md">
                                                <video ref={videoRef} autoPlay muted className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'}`} />
                                                {isProcessing && <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin mb-2"/><span className="text-xs font-bold">Memproses Wajah...</span></div>}
                                                {!isProcessing && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-48 h-64 border-2 border-white/50 rounded-[50%] border-dashed animate-pulse"></div></div>}
                                                <button onClick={() => !isProcessing && setIsCameraOpen(false)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition-colors z-30" disabled={isProcessing}><X size={20}/></button>
                                            </div>
                                        ) : (
                                            <div className="py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center mb-4">
                                                <User size={48} className="text-gray-300 mx-auto mb-2"/>
                                                <p className="text-gray-400 text-sm">Belum ada data wajah.</p>
                                            </div>
                                        )}

                                        <div className="flex gap-3 justify-center">
                                            {!isCameraOpen ? (
                                                <button onClick={startCamera} disabled={!isModelLoaded} className="px-6 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <Camera size={20} /> Mulai Registrasi
                                                </button>
                                            ) : (
                                                <button onClick={handleRegisterFace} disabled={isProcessing} className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-colors w-full max-w-xs flex items-center justify-center gap-2 disabled:opacity-70">
                                                    {isProcessing ? 'Menyimpan...' : 'Ambil Foto & Simpan'}
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* GANTI PASSWORD */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 opacity-80 hover:opacity-100 transition-opacity">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Key size={20} className="text-brand-primary"/> Ganti Password</h4>
                                <form onSubmit={handleUpdatePassword} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password Baru</label><input type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Konfirmasi</label><input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary" /></div>
                                    </div>
                                    <button type="submit" className="px-6 py-2 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors text-sm">Update Password</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* TAB PAYROLL */}
                    {activeTab === 'payroll' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50"><h4 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-brand-primary"/> Riwayat Gaji</h4></div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                        <tr><th className="px-6 py-4">Periode</th><th className="px-6 py-4 text-right">Gaji Pokok</th><th className="px-6 py-4 text-right text-green-600">Bonus</th><th className="px-6 py-4 text-right text-red-500">Potongan</th><th className="px-6 py-4 text-right font-bold">Diterima</th><th className="px-6 py-4 text-center">Aksi</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {payrolls.length === 0 ? (<tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400">Belum ada data gaji.</td></tr>) : payrolls.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium">{p.period_month}</td>
                                                <td className="px-6 py-4 text-right">Rp {parseInt(p.base_salary).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-green-600 font-medium">+ Rp {parseInt(p.bonus_sales).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-red-500 font-medium">- Rp {parseInt(p.late_penalty).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-bold text-brand-darkest">Rp {parseInt(p.net_salary).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => openSlip(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Slip">
                                                        <FileText size={18}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB LATE HISTORY (Same as before) */}
                    {activeTab === 'late' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={20} className="text-brand-primary"/> Riwayat Keterlambatan</h4>
                                <div className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-100">Total Telat: {lateLogs.reduce((acc, curr) => acc + parseInt(curr.late_minutes), 0)}m</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                        <tr><th className="px-6 py-4">Tanggal</th><th className="px-6 py-4">Jam Masuk</th><th className="px-6 py-4 text-center">Telat</th><th className="px-6 py-4 text-right">Denda</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {lateLogs.length === 0 ? (<tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400">Tidak ada data keterlambatan.</td></tr>) : lateLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-gray-700">{new Date(log.date).toLocaleDateString('id-ID')}</td>
                                                <td className="px-6 py-4 font-mono">{log.clock_in ? log.clock_in.split(' ')[1] : '-'}</td>
                                                <td className="px-6 py-4 text-center font-bold text-red-600">{log.late_minutes}m</td>
                                                <td className="px-6 py-4 text-right text-red-500 font-medium">Rp {(log.late_minutes * 1000).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL SLIP GAJI: FIXED SCROLL ISSUE */}
            {showSlipModal && selectedPayroll && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-start justify-center p-4 backdrop-blur-md overflow-y-auto pt-10 sm:pt-20">
                    <div className="relative w-full max-w-2xl bg-white rounded-none sm:rounded-xl shadow-2xl my-8">
                        <button onClick={() => setShowSlipModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-white rounded-full p-1 border shadow-sm z-10 no-print"><X size={24}/></button>
                        <Payslip data={selectedPayroll} />
                        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl no-print">
                            <button onClick={() => setShowSlipModal(false)} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">Tutup</button>
                            <button onClick={handlePrintSlip} className="px-6 py-2 bg-brand-darkest text-white font-bold rounded-lg shadow-lg hover:bg-gray-900 flex items-center gap-2"><Printer size={18}/> Cetak Slip</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}