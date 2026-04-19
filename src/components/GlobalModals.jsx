import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import useUIStore from '../store/useUIStore';

// Backdrop Hitam Transparan
// Default z-index dinaikkan jika tidak diset, tapi kita akan set manual di bawah
const Backdrop = ({ children, zIndex = 'z-50' }) => (
    <motion.div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center ${zIndex}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    >
        {children}
    </motion.div>
);

// Animasi Modal (Pop Up)
const modalVariants = {
    hidden: { scale: 0.9, opacity: 0, y: 20 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 500 } },
    exit: { scale: 0.9, opacity: 0, y: 20 }
};

export default function GlobalModals() {
    const {
        isLoading, loadingMessage,
        alert, closeAlert,
        confirm, closeConfirm
    } = useUIStore();

    const handleConfirmAction = () => {
        if (confirm.onConfirm) confirm.onConfirm();
        closeConfirm();
    };

    return (
        <AnimatePresence>

            {/* 1. LOADING MODAL - Level Tertinggi (z-80) */}
            {/* Agar spinner loading selalu terlihat di atas segalanya */}
            {isLoading && (
                <Backdrop zIndex="z-[80]">
                    <motion.div
                        variants={modalVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 min-w-[200px]"
                    >
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-brand-bg rounded-full"></div>
                            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                            {/* Logo kecil di tengah spinner */}
                            <img src="/taskora-icon.png?v=86" className="w-5 h-5 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-50" />
                        </div>
                        <p className="text-gray-600 font-medium animate-pulse">{loadingMessage}</p>
                    </motion.div>
                </Backdrop>
            )}

            {/* 2. ALERT MODAL - Level Tinggi (z-70) */}
            {/* Agar pesan error/sukses muncul di atas modal form produk (biasanya z-50) */}
            {alert.isOpen && (
                <Backdrop zIndex="z-[70]">
                    <motion.div
                        variants={modalVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className={`p-6 flex flex-col items-center text-center ${alert.type === 'error' ? 'bg-red-50' : 'bg-green-50'}`}>
                            {alert.type === 'success' && <CheckCircle2 className="w-16 h-16 text-green-500 mb-2" />}
                            {alert.type === 'error' && <XCircle className="w-16 h-16 text-brand-primary mb-2" />}
                            {alert.type === 'warning' && <AlertTriangle className="w-16 h-16 text-yellow-500 mb-2" />}

                            <h3 className="text-xl font-bold text-gray-800">{alert.title}</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 text-center mb-6">{alert.message}</p>
                            <button
                                onClick={closeAlert}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-transform active:scale-95 ${alert.type === 'error' ? 'bg-brand-primary hover:bg-brand-dark' : 'bg-green-500 hover:bg-green-600'
                                    }`}
                            >
                                Oke, Mengerti
                            </button>
                        </div>
                    </motion.div>
                </Backdrop>
            )}

            {/* 3. CONFIRMATION MODAL - Level Tinggi (z-70) */}
            {/* Agar pertanyaan "Yakin Hapus?" muncul di atas modal resep */}
            {confirm.isOpen && (
                <Backdrop zIndex="z-[70]">
                    <motion.div
                        variants={modalVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-brand-bg rounded-full shrink-0">
                                <HelpCircle className="w-8 h-8 text-brand-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-brand-darkest mb-2">{confirm.title}</h3>
                                <p className="text-gray-500 leading-relaxed">{confirm.message}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8 justify-end">
                            <button
                                onClick={closeConfirm}
                                className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-dark shadow-lg shadow-brand-primary/20 transition-transform active:scale-95"
                            >
                                Ya, Lanjutkan
                            </button>
                        </div>
                    </motion.div>
                </Backdrop>
            )}

        </AnimatePresence>
    );
}