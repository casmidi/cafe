import {
    LayoutDashboard, UtensilsCrossed, ClipboardList, Settings, LogOut, X, Monitor, Package, ChefHat, Truck, Box, BarChart3, Users as UsersIcon, Smile, Wallet, Tag, Grid, ClipboardCheck, UserCheck, DollarSign, Coins, Activity
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import useUIStore from '../store/useUIStore';

export default function Sidebar({ isOpen, toggleSidebar, handleLogout }) {
    const location = useLocation();
    const { appSettings } = useUIStore();

    // Ambil role user dari localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || 'kasir'; // Default kasir jika tidak ada role

    // Definisi Menu dengan Izin Akses (allowedRoles)
    const menuGroups = [
        {
            title: 'Utama',
            items: [
                { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', allowedRoles: ['owner', 'admin', 'kasir'] },
                { name: 'Kasir (POS)', icon: Monitor, path: '/pos', allowedRoles: ['owner', 'admin', 'kasir', 'waiter'] },
                { name: 'Shift Kasir', icon: Wallet, path: '/shift', allowedRoles: ['owner', 'admin', 'kasir'] },
                { name: 'Riwayat Order', icon: ClipboardList, path: '/orders', allowedRoles: ['owner', 'admin', 'kasir', 'waiter'] },
            ]
        },
        {
            title: 'Operasional',
            items: [
                { name: 'Dapur (KDS)', icon: ChefHat, path: '/kitchen', allowedRoles: ['owner', 'admin', 'dapur'] },
                { name: 'Denah Meja', icon: Grid, path: '/tables', allowedRoles: ['owner', 'admin', 'kasir', 'waiter'] },
                { name: 'Pelanggan', icon: Smile, path: '/customers', allowedRoles: ['owner', 'admin', 'kasir'] },
            ]
        },
        {
            title: 'Inventory & Keuangan',
            items: [
                { name: 'Stok Bahan', icon: Package, path: '/inventory', allowedRoles: ['owner', 'admin', 'dapur'] },
                { name: 'Stok Opname', icon: ClipboardCheck, path: '/inventory/opname', allowedRoles: ['owner', 'admin', 'dapur'] },
                { name: 'Pembelian (PO)', icon: Truck, path: '/purchasing', allowedRoles: ['owner', 'admin'] },
                { name: 'Penerimaan', icon: Box, path: '/receiving', allowedRoles: ['owner', 'admin', 'dapur'] },
                { name: 'Pengeluaran', icon: Coins, path: '/expenses', allowedRoles: ['owner', 'admin'] },
                { name: 'Laporan', icon: BarChart3, path: '/reports', allowedRoles: ['owner', 'admin'] },
                { name: 'Analisis Bisnis', icon: Activity, path: '/analytics', allowedRoles: ['owner', 'admin'] },
            ]
        },
        {
            title: 'HRM & Karyawan',
            items: [
                { name: 'Data Karyawan', icon: UsersIcon, path: '/users', allowedRoles: ['owner', 'admin'] },
                { name: 'Absensi', icon: UserCheck, path: '/attendance', allowedRoles: ['owner', 'admin', 'kasir', 'dapur', 'waiter'] }, // Semua pegawai butuh absen
                { name: 'Payroll', icon: DollarSign, path: '/payroll', allowedRoles: ['owner'] }, // Hanya Owner yg bisa lihat gaji
            ]
        },
        {
            title: 'Master Data',
            items: [
                { name: 'Menu & Resep', icon: UtensilsCrossed, path: '/menu', allowedRoles: ['owner', 'admin'] },
                { name: 'Promo & Diskon', icon: Tag, path: '/discounts', allowedRoles: ['owner', 'admin'] },
                { name: 'Pengaturan', icon: Settings, path: '/settings', allowedRoles: ['owner', 'admin'] },
            ]
        }
    ];

    // Filter Menu Berdasarkan Role
    const filteredMenuGroups = menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => item.allowedRoles.includes(role))
    })).filter(group => group.items.length > 0); // Hapus grup jika kosong

    return (
        <>
            {isOpen && (<div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar}></div>)}

            <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

                {/* HEADER SIDEBAR */}
                <div className="h-20 flex items-center justify-center px-6 border-b border-gray-50 relative shrink-0">
                    <img
                        src={appSettings?.logo_url || "/taskora-logo.png?v=86"}
                        alt={appSettings?.name || "Logo"}
                        className="h-10 w-auto object-contain"
                    />
                    <button onClick={toggleSidebar} className="lg:hidden absolute right-4 text-gray-400 hover:text-brand-primary p-1">
                        <X size={24} />
                    </button>
                </div>

                {/* MENU LIST */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {filteredMenuGroups.map((group, idx) => (
                        <div key={idx}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-4">
                                {group.title}
                            </p>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            onClick={() => isOpen && toggleSidebar()}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-brand-darkest'}`}
                                        >
                                            <item.icon size={18} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-primary'} />
                                            <span className="text-sm">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* FOOTER SIDEBAR */}
                <div className="p-4 border-t border-gray-50 shrink-0 bg-gray-50/50">
                    <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 font-medium text-sm">
                        <LogOut size={18} /> Keluar
                    </button>
                    <p className="text-[10px] text-center text-gray-300 mt-3">v1.2.0 &copy; 2024</p>
                </div>
            </div>
        </>
    );
}