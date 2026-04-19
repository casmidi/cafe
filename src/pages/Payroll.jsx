import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Calculator, Printer, Download, FileText, X, Search, Users, Calendar, Clock, User } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Payroll() {
    // State Data
    const [payrolls, setPayrolls] = useState([]);
    const [attendanceHistory, setAttendanceHistory] = useState([]); // State untuk riwayat absensi
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState({});
    
    // Tab & Filter
    const [activeTab, setActiveTab] = useState('payroll'); // 'payroll' | 'attendance'
    const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); 
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [searchEmployee, setSearchEmployee] = useState(''); // Filter nama karyawan

    // Modal Generate & Inputs Manual
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [manualInput, setManualInput] = useState({
        bonus: 0, allowance: 0, overtime: 0, bpjs: 0, tax: 0, kasbon: 0
    });

    // Modal Detail/Slip
    const [showSlipModal, setShowSlipModal] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);

    const { showLoading, hideLoading, showAlert } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (activeTab === 'payroll') fetchPayrollList();
        if (activeTab === 'attendance') fetchAttendanceHistory();
    }, [selectedPeriod, activeTab]);

    const fetchInitialData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [userRes, settingRes] = await Promise.all([
                axios.get(API_URL + 'users', config),
                axios.get(API_URL + 'settings', config)
            ]);
            if (userRes.data.status) setUsers(userRes.data.data);
            if (settingRes.data.status) {
                setSettings(settingRes.data.data);
                if(settingRes.data.data.logo_url) {
                    const img = new Image();
                    img.src = settingRes.data.data.logo_url;
                }
            }
        } catch (error) { console.error(error); }
    };

    const fetchPayrollList = async () => {
        setIsLoadingData(true);
        try {
            const res = await axios.get(`${API_URL}payroll/list&period=${selectedPeriod}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) setPayrolls(res.data.data);
        } catch (error) { console.error(error); } finally { setIsLoadingData(false); }
    };

    const fetchAttendanceHistory = async () => {
        setIsLoadingData(true);
        try {
            const res = await axios.get(`${API_URL}attendance/all-history&month=${selectedPeriod}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) setAttendanceHistory(res.data.data);
        } catch (error) { console.error(error); } finally { setIsLoadingData(false); }
    };

    const handleGenerate = async () => {
        if (!selectedUser) return showAlert('error', 'Pilih Karyawan', 'Silakan pilih karyawan terlebih dahulu.');
        
        showLoading('Menghitung Gaji...');
        try {
            const payload = {
                user_id: selectedUser,
                period: selectedPeriod,
                manual_bonus: parseFloat(manualInput.bonus) || 0,
                manual_allowance: parseFloat(manualInput.allowance) || 0,
                manual_overtime: parseFloat(manualInput.overtime) || 0,
                manual_bpjs: parseFloat(manualInput.bpjs) || 0,
                manual_tax: parseFloat(manualInput.tax) || 0,
                manual_deduction: parseFloat(manualInput.kasbon) || 0
            };

            const res = await axios.post(API_URL + 'payroll/generate', payload, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                showAlert('success', 'Berhasil', `Gaji berhasil disimpan. THP: Rp ${parseInt(res.data.net_salary).toLocaleString()}`);
                setShowGenerateModal(false);
                setManualInput({ bonus: 0, allowance: 0, overtime: 0, bpjs: 0, tax: 0, kasbon: 0 }); 
                setSelectedUser('');
                fetchPayrollList();
            } else { showAlert('error', 'Gagal', res.data.message); }
        } catch (error) { showAlert('error', 'Error', error.response?.data?.message || 'Gagal generate payroll.'); } finally { hideLoading(); }
    };

    const openSlip = (payroll) => { setSelectedPayroll(payroll); setShowSlipModal(true); };
    const handlePrintSlip = () => { window.print(); };

    const Payslip = ({ data }) => {
        if (!data) return null;
        const fmt = (num) => parseInt(num || 0).toLocaleString('id-ID');

        return (
            <div id="printable-slip" className="p-8 bg-white text-gray-800 font-sans max-w-2xl mx-auto border border-gray-200 shadow-sm print:shadow-none print:border-none">
                <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-6 h-24">
                    <div className="flex items-center h-full">
                        {settings.logo_url ? (
                            <img src={settings.logo_url} alt="Logo" className="h-full w-auto object-contain grayscale" />
                        ) : (
                            <h2 className="text-3xl font-bold uppercase tracking-wider text-gray-900">{settings.name || 'COMPANY NAME'}</h2>
                        )}
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-bold text-gray-400 tracking-widest">SLIP GAJI</h1>
                        <p className="font-mono font-bold text-lg mt-1">{data.period_month}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 text-sm border-b border-dashed border-gray-300 pb-6">
                    <div>
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Karyawan</p>
                        <p className="font-bold text-xl text-gray-900">{data.employee_name}</p>
                        <p className="text-gray-500 mt-1 font-mono">ID: #{data.user_id.toString().padStart(4, '0')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Tanggal Cetak</p>
                        <p className="font-bold text-lg">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-16 gap-y-4 mb-8">
                    <div>
                        <h4 className="font-bold border-b-2 border-gray-100 pb-2 mb-3 text-xs uppercase tracking-wider text-gray-500">Pendapatan</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Gaji Pokok</span><span className="font-bold text-gray-900">Rp {fmt(data.base_salary)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Bonus / Insentif</span><span className="font-medium text-gray-900">Rp {fmt(data.bonus_sales)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Tunjangan</span><span className="font-medium text-gray-900">Rp {fmt(data.total_allowance)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Lembur</span><span className="font-medium text-gray-900">Rp {fmt(data.overtime_pay)}</span></div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold border-b-2 border-gray-100 pb-2 mb-3 text-xs uppercase tracking-wider text-red-500">Potongan</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Denda Terlambat</span><span className="font-medium text-red-500">(Rp {fmt(data.late_penalty)})</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">PPh 21</span><span className="font-medium text-red-500">(Rp {fmt(data.tax_amount)})</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">BPJS</span><span className="font-medium text-red-500">(Rp {fmt(data.bpjs_amount)})</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Kasbon / Lainnya</span><span className="font-medium text-red-500">(Rp {fmt(data.total_deduction)})</span></div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-900 text-white p-6 rounded-xl flex justify-between items-center shadow-lg print:bg-gray-100 print:text-black print:border print:border-gray-300 print:shadow-none">
                    <div><p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1">TAKE HOME PAY</p><p className="text-xs opacity-50">Gaji Bersih Diterima</p></div>
                    <h2 className="text-4xl font-bold tracking-tight">Rp {fmt(data.net_salary)}</h2>
                </div>

                <div className="mt-20 pt-8 border-t border-gray-200 flex justify-between text-xs text-center text-gray-500">
                    <div className="w-40"><p className="mb-20">Penerima,</p><p className="font-bold border-t border-gray-300 pt-2 text-gray-900">{data.employee_name}</p></div>
                    <div className="w-40"><p className="mb-20">Manager,</p><p className="font-bold border-t border-gray-300 pt-2 text-gray-900">Authorized Signature</p></div>
                </div>
            </div>
        );
    };

    const totalExpense = payrolls.reduce((sum, p) => sum + parseFloat(p.net_salary), 0);
    
    // Filter Riwayat Absensi
    const filteredAttendance = attendanceHistory.filter(h => 
        h.employee_name.toLowerCase().includes(searchEmployee.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            <style>{`@media print { body * { visibility: hidden; } #printable-slip, #printable-slip * { visibility: visible; } #printable-slip { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 40px; border: none; } @page { margin: 0; size: auto; } }`}</style>

            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div><h3 className="text-brand-darkest font-bold text-2xl flex items-center gap-2"><DollarSign size={28}/> Payroll & Absensi</h3><p className="text-gray-500 text-sm">Kelola gaji dan pantau kehadiran karyawan.</p></div>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                    <input type="month" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 px-2" />
                    {activeTab === 'payroll' && (
                        <button onClick={() => setShowGenerateModal(true)} className="px-4 py-2 bg-brand-primary text-white text-sm font-bold rounded-lg hover:bg-brand-dark flex items-center gap-2 shadow-lg active:scale-95 transition-transform"><Calculator size={16}/> Hitung Gaji</button>
                    )}
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex gap-2 border-b border-gray-200 pb-1">
                <button onClick={() => setActiveTab('payroll')} className={`px-6 py-2 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'payroll' ? 'bg-white text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                    <DollarSign size={16} className="inline mr-2 mb-0.5"/> Gaji Karyawan
                </button>
                <button onClick={() => setActiveTab('attendance')} className={`px-6 py-2 text-sm font-bold rounded-t-xl transition-colors ${activeTab === 'attendance' ? 'bg-white text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Users size={16} className="inline mr-2 mb-0.5"/> Data Absensi
                </button>
            </div>

            {/* TAB PAYROLL */}
            {activeTab === 'payroll' && (
                <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div><p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Pengeluaran Gaji ({new Date(selectedPeriod).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})</p><h2 className="text-3xl font-bold text-brand-darkest">Rp {totalExpense.toLocaleString('id-ID')}</h2></div>
                        <div className="p-4 bg-green-50 rounded-full text-green-600"><DollarSign size={32} /></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-50"><h4 className="font-bold text-gray-800">Daftar Slip Gaji</h4></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-500 bg-gray-50/50 uppercase text-xs">
                                    <tr><th className="px-6 py-4">Nama</th><th className="px-6 py-4 text-right">Gaji Pokok</th><th className="px-6 py-4 text-right text-green-600">Bonus</th><th className="px-6 py-4 text-right text-red-500">Potongan</th><th className="px-6 py-4 font-bold text-right">THP</th><th className="px-6 py-4 text-center">Aksi</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {payrolls.length === 0 ? (<tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Belum ada data gaji.</td></tr>) : payrolls.map((p) => {
                                        const totalBonus = parseFloat(p.bonus_sales) + parseFloat(p.total_allowance || 0) + parseFloat(p.overtime_pay || 0);
                                        const totalDeduct = parseFloat(p.late_penalty) + parseFloat(p.tax_amount) + parseFloat(p.bpjs_amount) + parseFloat(p.total_deduction || 0);
                                        return (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2"><div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs">{p.employee_name.charAt(0)}</div>{p.employee_name}</td>
                                                <td className="px-6 py-4 text-right text-gray-600">Rp {parseInt(p.base_salary).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-green-600 font-medium">+ Rp {totalBonus.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-red-500 font-medium">- Rp {totalDeduct.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-bold text-brand-primary text-lg">Rp {parseInt(p.net_salary).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center"><button onClick={() => openSlip(p)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><FileText size={18} /></button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* TAB ABSENSI (BARU) */}
            {activeTab === 'attendance' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Cari nama karyawan..." 
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-accent outline-none"
                                value={searchEmployee}
                                onChange={e => setSearchEmployee(e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-gray-500">Total: <b>{filteredAttendance.length}</b> log</div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50/50 uppercase text-xs sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-3">Karyawan</th>
                                    <th className="px-6 py-3">Tanggal</th>
                                    <th className="px-6 py-3">Jam Masuk</th>
                                    <th className="px-6 py-3">Jam Pulang</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-right">Telat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredAttendance.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Tidak ada data absensi untuk periode ini.</td></tr>
                                ) : filteredAttendance.map((att) => (
                                    <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-bold text-gray-800">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">{att.employee_name?.charAt(0)}</div>
                                                <div><p>{att.employee_name}</p><p className="text-[10px] text-gray-400 font-normal">@{att.username}</p></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">{new Date(att.date).toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' })}</td>
                                        <td className="px-6 py-3 font-mono text-green-600">{att.clock_in ? att.clock_in.split(' ')[1] : '-'}</td>
                                        <td className="px-6 py-3 font-mono text-gray-500">{att.clock_out ? att.clock_out.split(' ')[1] : '-'}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${att.status === 'late' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {att.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {att.late_minutes > 0 ? <span className="text-red-500 font-bold">{att.late_minutes} mnt</span> : <span className="text-gray-300">-</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL GENERATE & SLIP (Tetap Sama) */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto pt-10 sm:pt-20">
                    <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 mb-8">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-brand-darkest">Hitung Gaji & Potongan</h3><button onClick={() => setShowGenerateModal(false)}><X size={20} className="text-gray-400"/></button></div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Karyawan</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary bg-white" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                                    <option value="">-- Pilih --</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                <p className="text-xs font-bold text-brand-primary uppercase mb-1 border-b border-gray-200 pb-1">Input Manual Komponen</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Bonus / Insentif</label><input type="number" className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" placeholder="0" value={manualInput.bonus} onChange={e => setManualInput({...manualInput, bonus: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Tunjangan Lain</label><input type="number" className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" placeholder="0" value={manualInput.allowance} onChange={e => setManualInput({...manualInput, allowance: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Lembur</label><input type="number" className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" placeholder="0" value={manualInput.overtime} onChange={e => setManualInput({...manualInput, overtime: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Kasbon / Lainnya</label><input type="number" className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white" placeholder="0" value={manualInput.kasbon} onChange={e => setManualInput({...manualInput, kasbon: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Potongan BPJS</label><input type="number" className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white" placeholder="0" value={manualInput.bpjs} onChange={e => setManualInput({...manualInput, bpjs: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Potongan PPh 21</label><input type="number" className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white" placeholder="0" value={manualInput.tax} onChange={e => setManualInput({...manualInput, tax: e.target.value})} /></div>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800"><p className="font-bold">Catatan:</p><ul className="list-disc ml-4 space-y-1"><li>Denda keterlambatan dihitung <b>otomatis</b> dari absensi.</li><li>Gaji Pokok dari profil karyawan.</li></ul></div>
                            <button onClick={handleGenerate} disabled={!selectedUser} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg disabled:opacity-50 transition-transform active:scale-95 mt-2">Simpan & Generate</button>
                        </div>
                    </div>
                </div>
            )}

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