import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import useUIStore from '../store/useUIStore'; // Import Store

export default function Layout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    
    // Panggil fungsi modal konfirmasi
    const { showConfirm, showLoading, hideLoading } = useUIStore();

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogout = () => {
        // Tampilkan Modal Konfirmasi Profesional
        showConfirm(
            'Konfirmasi Logout',
            'Apakah Anda yakin ingin mengakhiri sesi shift ini? Anda harus login ulang untuk mengakses sistem.',
            () => {
                // Aksi jika user klik "Ya, Lanjutkan"
                showLoading('Sedang logout...');
                
                setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    hideLoading();
                    navigate('/');
                }, 800); // Simulasi delay agar terlihat smooth
            }
        );
    };

    return (
        <div className="flex h-screen bg-brand-bg/50 overflow-hidden font-sans">
            <Sidebar 
                isOpen={isSidebarOpen} 
                toggleSidebar={toggleSidebar} 
                handleLogout={handleLogout} 
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <Header 
                    toggleSidebar={toggleSidebar} 
                    user={user} 
                />

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 pb-24">
                    {children}
                </main>
            </div>
        </div>
    );
}