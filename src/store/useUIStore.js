import { create } from 'zustand';

const useUIStore = create((set) => ({
    // --- STATE LOADING ---
    isLoading: false,
    loadingMessage: 'Memproses...',
    showLoading: (message = 'Memproses...') => set({ isLoading: true, loadingMessage: message }),
    hideLoading: () => set({ isLoading: false }),

    // --- STATE ALERT (Notifikasi Sukses/Error) ---
    alert: { isOpen: false, type: 'success', title: '', message: '' },
    showAlert: (type, title, message) => set({ 
        alert: { isOpen: true, type, title, message } 
    }),
    closeAlert: () => set({ 
        alert: { isOpen: false, type: 'success', title: '', message: '' } 
    }),

    // --- STATE CONFIRM (Konfirmasi Ya/Tidak) ---
    confirm: { isOpen: false, title: '', message: '', onConfirm: null },
    showConfirm: (title, message, onConfirm) => set({ 
        confirm: { isOpen: true, title, message, onConfirm } 
    }),
    closeConfirm: () => set({ 
        confirm: { isOpen: false, title: '', message: '', onConfirm: null } 
    }),

    // --- STATE GLOBAL SETTINGS (LOGO & INFO) ---
    // Pastikan ini ada agar Sidebar tidak error saat load awal
    appSettings: { logo_url: '/taskora-logo.png?v=86', name: 'Cafe 86' },
    setAppSettings: (settings) => set({ appSettings: settings })
}));

export default useUIStore;