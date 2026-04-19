import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users as UsersIcon, Plus, Edit3, Trash2, Shield, Key, User, Clock, DollarSign, Briefcase, Mail } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [form, setForm] = useState({
        id: '',
        name: '',
        username: '',
        email: '', // Field Baru
        password: '',
        role: 'kasir',
        base_salary: '',
        hourly_rate: '',
        shift_start: '08:00',
        shift_end: '17:00'
    });

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        showLoading('Memuat data...');
        try {
            const res = await axios.get(API_URL + 'users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setUsers(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            hideLoading();
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setForm({ 
            id: '', name: '', username: '', email: '', password: '', role: 'kasir',
            base_salary: '', hourly_rate: '', shift_start: '08:00', shift_end: '17:00'
        });
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setIsEditing(true);
        setForm({
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email || '', // Load email
            password: '', 
            role: user.role,
            base_salary: user.base_salary || '',
            hourly_rate: user.hourly_rate || '',
            shift_start: user.shift_start ? user.shift_start.slice(0,5) : '08:00',
            shift_end: user.shift_end ? user.shift_end.slice(0,5) : '17:00'
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        showLoading('Menyimpan...');
        
        try {
            if (isEditing) {
                await axios.put(API_URL + 'users', form, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Data pengguna diperbarui');
            } else {
                await axios.post(API_URL + 'users', form, { headers: { Authorization: `Bearer ${token}` } });
                showAlert('success', 'Berhasil', 'Pengguna baru ditambahkan');
            }
            setShowModal(false);
            fetchUsers();
        } catch (error) {
            const msg = error.response?.data?.message || 'Gagal menyimpan data';
            showAlert('error', 'Gagal', msg);
        } finally {
            hideLoading();
        }
    };

    const handleDelete = (id) => {
        showConfirm('Hapus Pengguna?', 'Akun ini tidak akan bisa login lagi.', async () => {
            showLoading('Menghapus...');
            try {
                await axios.delete(API_URL + 'users&id=' + id, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showAlert('success', 'Terhapus', 'Pengguna berhasil dihapus');
                fetchUsers();
            } catch (error) {
                showAlert('error', 'Gagal', 'Gagal menghapus pengguna');
            } finally {
                hideLoading();
            }
        });
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl">Manajemen Pengguna</h3>
                    <p className="text-gray-500 text-sm">Kelola akses karyawan, gaji, dan jadwal shift.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-dark font-medium transition-colors shadow-lg shadow-brand-primary/20"
                >
                    <Plus size={18} /> Tambah User
                </button>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                    <div key={user.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-primary font-bold text-xl">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{user.name}</h4>
                                    <p className="text-xs text-gray-500">@{user.username}</p>
                                    {user.email && <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Mail size={10}/> {user.email}</p>}
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                user.role === 'dapur' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                                {user.role}
                            </span>
                        </div>
                        
                        {/* Info Gaji Ringkas */}
                        <div className="mb-4 text-xs text-gray-500 space-y-1 border-t border-dashed border-gray-100 pt-2">
                            <div className="flex justify-between">
                                <span>Shift:</span>
                                <span className="font-medium">{user.shift_start ? user.shift_start.slice(0,5) : '-'} s/d {user.shift_end ? user.shift_end.slice(0,5) : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Gaji Pokok:</span>
                                <span className="font-medium text-green-600">Rp {parseInt(user.base_salary || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-50">
                            <button 
                                onClick={() => openEditModal(user)}
                                className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Edit3 size={16} /> Edit
                            </button>
                            <button 
                                onClick={() => handleDelete(user.id)}
                                className="flex-1 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> Hapus
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL FORM */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-xl text-brand-darkest mb-6">
                            {isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input 
                                            type="text" required
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                                            placeholder="Nama Karyawan"
                                            value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hak Akses (Role)</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <select 
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                                            value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                                        >
                                            <option value="kasir">Kasir</option>
                                            <option value="dapur">Dapur</option>
                                            <option value="admin">Admin</option>
                                            <option value="owner">Owner</option>
                                            <option value="waiter">Waiter</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* EMAIL FIELD BARU */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Untuk Reset Password)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="email" 
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                                        placeholder="karyawan@example.com"
                                        value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input 
                                            type="text" required disabled={isEditing}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-gray-100"
                                            placeholder="Username unik"
                                            value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        {isEditing ? 'Pass Baru (Opsional)' : 'Password'}
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input 
                                            type="password" 
                                            required={!isEditing}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                                            placeholder="******"
                                            value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* SECTION GAJI & SHIFT */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                                <p className="text-xs font-bold text-brand-primary uppercase tracking-wide border-b border-gray-200 pb-2">Pengaturan Gaji & Shift</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gaji Pokok (Bulanan)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input 
                                                type="number" 
                                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                                                placeholder="0"
                                                value={form.base_salary} onChange={e => setForm({...form, base_salary: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rate Lembur (Per Jam)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input 
                                                type="number" 
                                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                                                placeholder="0"
                                                value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jam Masuk</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input 
                                                type="time" 
                                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                                                value={form.shift_start} onChange={e => setForm({...form, shift_start: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jam Pulang</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input 
                                                type="time" 
                                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                                                value={form.shift_end} onChange={e => setForm({...form, shift_end: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Batal</button>
                                <button type="submit" className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}