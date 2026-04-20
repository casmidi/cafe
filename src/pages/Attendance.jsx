import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Camera, MapPin, RefreshCcw, Loader2, Clock, UserCheck, LogIn, Zap, X, Info } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

// PENTING: Jangan import face-api secara statis di sini untuk menghindari error 'Illegal constructor'
// import * as faceapi from 'face-api.js'; // <--- INI PENYEBABNYA

export default function Attendance() {
    const [location, setLocation] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [history, setHistory] = useState([]);
    const [todayStatus, setTodayStatus] = useState('none');
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [hasFaceId, setHasFaceId] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualReason, setManualReason] = useState('');

    // Kita simpan referensi library di sini setelah diload dinamis
    const faceApiRef = useRef(null);
    const videoRef = useRef(null);

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            // 1. Load face-api.js secara DINAMIS
            try {
                const faceapi = await import('face-api.js');
                faceApiRef.current = faceapi; // Simpan ke ref untuk dipakai nanti

                // 2. Load Model
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                if (isMounted) {
                    setIsModelLoaded(true);
                    console.log("Model Face API dimuat");
                }
            } catch (e) {
                console.error("Gagal memuat face-api:", e);
                if (isMounted) showAlert('error', 'System', 'Gagal memuat modul AI.');
            }

            if (isMounted) {
                checkFaceRegistration();
                getLocation();
                fetchHistory();
            }
        };

        init();

        return () => { isMounted = false; };
    }, []);

    const checkFaceRegistration = async () => {
        try {
            const res = await axios.get(API_URL + 'auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                if (res.data.data && !res.data.data.has_face_id) {
                    showConfirm(
                        'Wajah Belum Terdaftar',
                        'Anda belum mendaftarkan wajah untuk absensi. Silakan daftar sekarang di halaman Profil.',
                        () => navigate('/profile')
                    );
                } else {
                    setHasFaceId(true);
                }
            }
        } catch (error) { console.error("Gagal cek face ID:", error); }
    };

    const getLocation = () => {
        if (!navigator.geolocation) {
            showAlert('error', 'Error', 'Browser tidak mendukung Geolocation.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => {
                console.error(err);
                showAlert('warning', 'Lokasi', 'Gagal ambil lokasi GPS. Pastikan GPS aktif dan izin diberikan.');
            }
        );
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get(API_URL + 'attendance/history', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status && Array.isArray(res.data.data)) {
                setHistory(res.data.data);
                const today = new Date().toISOString().split('T')[0];
                const todayLog = res.data.data.find(log => log.date === today);

                if (todayLog) {
                    if (todayLog.clock_out) {
                        setTodayStatus('checked_out');
                    } else {
                        setTodayStatus('checked_in');
                    }
                } else {
                    setTodayStatus('none');
                }

                console.log('[fetchHistory] Updated status:', todayLog ? (todayLog.clock_out ? 'checked_out' : 'checked_in') : 'none');
            }
        } catch (e) { console.error("Gagal fetch history:", e); }
    };

    const startCamera = () => {
        if (!hasFaceId) {
            return showAlert('error', 'Gagal', 'Wajah belum terdaftar. Silakan ke menu Profil.');
        }
        if (!isModelLoaded || !faceApiRef.current) {
            return showAlert('warning', 'Tunggu', 'Model AI sedang dimuat... Coba sesaat lagi.');
        }
        setIsCameraOpen(true);

        setTimeout(() => {
            navigator.mediaDevices.getUserMedia({ video: {} })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch((err) => {
                    console.error(err);
                    showAlert('error', 'Error', 'Gagal akses kamera. Periksa izin browser.');
                    setIsCameraOpen(false);
                });
        }, 100);
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    };

    const handleAttendance = async () => {
        if (!location) return showAlert('error', 'Lokasi', 'Tunggu lokasi terkunci...');
        if (!videoRef.current || !faceApiRef.current) return;

        const faceapi = faceApiRef.current; // Gunakan instance dari ref
        setIsProcessing(true);

        try {
            // 1. Detect & Get Descriptor
            const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks().withFaceDescriptors();

            if (!detections.length) throw new Error("Wajah tidak ditemukan. Posisikan wajah di tengah.");
            if (detections.length > 1) throw new Error("Terdeteksi lebih dari 1 wajah.");

            // 2. Capture Foto (Blob)
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Gagal mengambil foto.");

                const endpoint = todayStatus === 'none' ? 'attendance/clock-in' : 'attendance/clock-out';
                const formData = new FormData();
                formData.append('latitude', location.lat);
                formData.append('longitude', location.lng);
                formData.append('photo', blob, 'attendance.jpg');
                formData.append('face_descriptor', JSON.stringify(Array.from(detections[0].descriptor)));

                const res = await axios.post(API_URL + endpoint, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.status) {
                    showAlert('success', 'Berhasil', res.data.message);
                    stopCamera();
                    fetchHistory();
                } else {
                    throw new Error(res.data.message || "Gagal absen.");
                }
            }, 'image/jpeg', 0.8);

        } catch (error) {
            console.error(error);
            let msg = error.message;
            if (error.response && error.response.data) {
                msg = error.response.data.message;
            }
            showAlert('error', 'Gagal', msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualAttendance = async () => {
        if (!manualReason.trim()) return showAlert('warning', 'Alasan Wajib', 'Silakan isi alasan absen manual.');

        showLoading(`Memproses Absen ${todayStatus === 'none' ? 'Masuk' : 'Pulang'} Manual...`);
        try {
            const formData = new FormData();
            formData.append('reason', manualReason);

            const endpoint = todayStatus === 'none' ? 'attendance/clock-in-manual' : 'attendance/clock-out-manual';
            const res = await axios.post(API_URL + endpoint, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                showAlert('success', 'Berhasil', res.data.message);
                setShowManualModal(false);
                setManualReason('');
                fetchHistory();
            } else {
                throw new Error(res.data.message || 'Gagal absen manual.');
            }
        } catch (error) {
            console.error(error);
            let msg = error.message;
            if (error.response && error.response.data) {
                msg = error.response.data.message;
            }
            showAlert('error', 'Gagal', msg);
        } finally {
            hideLoading();
        }
    };

    return (
        <div className="pb-20 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-brand-darkest">Absensi</h3>
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${location ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <MapPin size={14} /> {location ? 'GPS Siap' : 'Cari GPS...'}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                <div className="mb-6 flex justify-center">
                    {todayStatus === 'none' && (
                        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
                            <LogIn size={20} />
                            <span className="font-bold">Belum Absen Masuk</span>
                        </div>
                    )}
                    {todayStatus === 'checked_in' && (
                        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-2">
                            <Clock size={20} />
                            <span className="font-bold">Sudah Masuk. Waktunya Pulang?</span>
                        </div>
                    )}
                    {todayStatus === 'checked_out' && (
                        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl border border-gray-200 flex items-center gap-2">
                            <UserCheck size={20} />
                            <span className="font-bold">Absensi Hari Ini Selesai</span>
                        </div>
                    )}
                </div>

                {todayStatus !== 'checked_out' ? (
                    <>
                        {/* OPTION PILIHAN ABSEN: Foto vs Manual (SELALU TERLIHAT) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={startCamera}
                                disabled={!hasFaceId || !isModelLoaded}
                                className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${(hasFaceId && isModelLoaded) ? 'bg-brand-primary hover:bg-brand-dark' : 'bg-gray-400 cursor-not-allowed'}`}
                                title={!hasFaceId ? 'Wajah belum terdaftar' : !isModelLoaded ? 'Model AI sedang dimuat...' : ''}
                            >
                                <Camera size={20} /> {todayStatus === 'none' ? 'Absen Foto' : 'Pulang Foto'}
                            </button>
                            <button
                                onClick={() => {
                                    setManualReason('');
                                    setShowManualModal(true);
                                }}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Zap size={20} /> {todayStatus === 'none' ? 'Absen Manual (Tanpa Foto)' : 'Pulang Manual (Tanpa Foto)'}
                            </button>
                        </div>

                        <div className="mb-6 text-left bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <p className="text-xs sm:text-sm text-blue-800 flex items-start gap-2">
                                <Info size={16} className="mt-0.5 shrink-0" />
                                <span>
                                    Absensi manual ada di tombol biru. Posisi tombolnya di sebelah tombol foto pada layar besar, dan berada di bawah tombol foto pada layar mobile.
                                </span>
                            </p>
                        </div>

                        {/* CAMERA VIEW - HANYA TAMPIL SAAT CAMERA DIBUKA */}
                        {isCameraOpen ? (
                            <>
                                <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-4 mx-auto max-w-md shadow-lg">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        className="w-full h-full object-cover transform scale-x-[-1]"
                                        playsInline
                                    />
                                    {isProcessing && (
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-sm z-10">
                                            <Loader2 className="animate-spin mb-2" size={32} />
                                            <span className="font-bold text-sm">Memverifikasi Wajah...</span>
                                        </div>
                                    )}
                                    {!isProcessing && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-48 h-64 border-2 border-white/60 rounded-[50%] border-dashed"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={stopCamera}
                                        className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                                        disabled={isProcessing}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleAttendance}
                                        disabled={isProcessing}
                                        className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${todayStatus === 'none' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                                    >
                                        {isProcessing ? 'Memproses...' : (todayStatus === 'none' ? 'Konfirmasi Masuk' : 'Konfirmasi Pulang')}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="py-10 bg-gray-50 rounded-xl border-2 border-dashed mb-4 hover:bg-gray-100 transition-colors">
                                <Camera size={48} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-500 text-sm">Pastikan wajah terlihat jelas</p>
                            </div>
                        )}

                        {/* MODAL ABSEN MANUAL */}
                        {showManualModal && (
                            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-800">
                                                {todayStatus === 'none' ? '📍 Absen Masuk Manual' : '👋 Absen Pulang Manual'}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {todayStatus === 'none' ? 'Jelaskan alasan absen masuk tanpa foto wajah' : 'Jelaskan alasan absen pulang tanpa foto wajah'}
                                            </p>
                                        </div>
                                        <button onClick={() => setShowManualModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                            <X size={24} className="text-gray-500" />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-wide">Alasan {todayStatus === 'none' ? 'Masuk' : 'Pulang'} Manual</label>
                                        <textarea
                                            value={manualReason}
                                            onChange={(e) => setManualReason(e.target.value)}
                                            placeholder={todayStatus === 'none' ? 'Contoh: Terlambat karena macet, laptop bermasalah, dll' : 'Contoh: Meeting dengan client, perlu meninggalkan kantor lebih awal, dll'}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                                            rows={4}
                                            autoFocus
                                        />
                                        <p className="text-xs text-gray-400 mt-2">Minimal 5 karakter, maksimal 500 karakter</p>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => setShowManualModal(false)}
                                            className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            onClick={handleManualAttendance}
                                            disabled={!manualReason.trim() || manualReason.length < 5}
                                            className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-colors ${manualReason.trim() && manualReason.length >= 5 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                                        >
                                            {todayStatus === 'none' ? '✓ Konfirmasi Masuk' : '✓ Konfirmasi Pulang'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-8">
                        <Clock size={64} className="text-green-500 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-gray-800">Sampai Jumpa Besok!</h4>
                        <p className="text-gray-500 text-sm mt-1">Terima kasih atas kerja keras Anda hari ini.</p>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <span className="font-bold text-gray-700 flex items-center gap-2"><RefreshCcw size={16} /> Riwayat Bulan Ini</span>
                    <button onClick={fetchHistory} className="p-1.5 bg-white border rounded-lg hover:bg-gray-50 text-gray-500"><RefreshCcw size={14} /></button>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Belum ada riwayat absensi.</div>
                    ) : (
                        history.map((h, i) => (
                            <div key={i} className="p-4 border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-gray-800">{new Date(h.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${h.status === 'late' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {h.status === 'late' ? 'Telat' : 'Hadir'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Masuk</span>
                                            <span className={`font-mono ${h.clock_in ? 'text-gray-700' : 'text-gray-300'}`}>{h.clock_in ? h.clock_in.split(' ')[1].slice(0, 5) : '--:--'}</span>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Pulang</span>
                                            <span className={`font-mono ${h.clock_out ? 'text-gray-700' : 'text-gray-300'}`}>{h.clock_out ? h.clock_out.split(' ')[1].slice(0, 5) : '--:--'}</span>
                                        </div>
                                    </div>
                                    {h.late_minutes > 0 && (
                                        <div className="text-right">
                                            <span className="text-[10px] text-red-400 block">Telat</span>
                                            <span className="font-bold text-red-500">{h.late_minutes} mnt</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}