import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Plus, Save, Move, Users, Trash2, X, Utensils, QrCode, Download, LayoutGrid, Map, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

const TABLE_SIZE = 96;
const SNAP_GAP = 16;
const SNAP_STEP = TABLE_SIZE + SNAP_GAP;
const MAP_PADDING = 24;

const sortTablesByNumber = (inputTables) => [...inputTables].sort((firstTable, secondTable) => String(firstTable.table_number).localeCompare(String(secondTable.table_number), undefined, {
    numeric: true,
    sensitivity: 'base',
});

export default function TableLayout() {
    const [tables, setTables] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'map' atau 'grid'
    const [dragPreview, setDragPreview] = useState(null);
    const [mapRenderKey, setMapRenderKey] = useState(0);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedTableQR, setSelectedTableQR] = useState(null);

    // Form State
    const [newTable, setNewTable] = useState({ table_number: '', capacity: 4 });

    const containerRef = useRef(null);

    const { showLoading, hideLoading, showAlert, showConfirm } = useUIStore();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchTables();
    }, []);

    const getRawPositionFromPointer = (event) => {
        if (!containerRef.current) return null;

        const containerRect = containerRef.current.getBoundingClientRect();

        return {
            rawX: event.clientX - containerRect.left + containerRef.current.scrollLeft - (TABLE_SIZE / 2),
            rawY: event.clientY - containerRect.top + containerRef.current.scrollTop - (TABLE_SIZE / 2),
        };
    };

    const getSnappedPosition = (rawX, rawY, movingTableId = null) => {
        const occupiedSlots = new Set(
            displayedTables
                .filter((table) => table.id !== movingTableId)
                .map((table) => {
                    const tableX = Number(table.position_x) || 0;
                    const tableY = Number(table.position_y) || 0;
                    const col = Math.max(0, Math.round(tableX / SNAP_STEP));
                    const row = Math.max(0, Math.round(tableY / SNAP_STEP));
                    return `${col}:${row}`;
                })
        );

        const targetCol = Math.max(0, Math.round(rawX / SNAP_STEP));
        const targetRow = Math.max(0, Math.round(rawY / SNAP_STEP));

        for (let radius = 0; radius < 50; radius += 1) {
            for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
                for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
                    if (Math.max(Math.abs(rowOffset), Math.abs(colOffset)) !== radius) continue;

                    const nextCol = targetCol + colOffset;
                    const nextRow = targetRow + rowOffset;

                    if (nextCol < 0 || nextRow < 0) continue;

                    const slotKey = `${nextCol}:${nextRow}`;
                    if (occupiedSlots.has(slotKey)) continue;

                    return {
                        x: nextCol * SNAP_STEP,
                        y: nextRow * SNAP_STEP,
                    };
                }
            }
        }

        return {
            x: targetCol * SNAP_STEP,
            y: targetRow * SNAP_STEP,
        };
    };

    const normalizeTablePositions = (inputTables) => {
        const occupiedSlots = new Set();

        return inputTables.map((table) => {
            const tableX = Number(table.position_x) || 0;
            const tableY = Number(table.position_y) || 0;
            const targetCol = Math.max(0, Math.round(tableX / SNAP_STEP));
            const targetRow = Math.max(0, Math.round(tableY / SNAP_STEP));

            for (let radius = 0; radius < 50; radius += 1) {
                for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
                    for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
                        if (Math.max(Math.abs(rowOffset), Math.abs(colOffset)) !== radius) continue;

                        const nextCol = targetCol + colOffset;
                        const nextRow = targetRow + rowOffset;

                        if (nextCol < 0 || nextRow < 0) continue;

                        const slotKey = `${nextCol}:${nextRow}`;
                        if (occupiedSlots.has(slotKey)) continue;

                        occupiedSlots.add(slotKey);

                        return {
                            ...table,
                            position_x: nextCol * SNAP_STEP,
                            position_y: nextRow * SNAP_STEP,
                        };
                    }
                }
            }

            return {
                ...table,
                position_x: targetCol * SNAP_STEP,
                position_y: targetRow * SNAP_STEP,
            };
        });
    };

    const displayedTables = useMemo(() => normalizeTablePositions(sortTablesByNumber(tables)), [tables]);

    const persistTablePositions = async (inputTables) => {
        for (const table of inputTables) {
            const response = await axios.post(API_URL + 'master/tables/position', {
                id: table.id,
                x: table.position_x,
                y: table.position_y,
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (!response?.data?.status) {
                throw new Error(response?.data?.message || 'Gagal simpan posisi meja');
            }
        }
    };

    const mapBounds = [...displayedTables, dragPreview].filter(Boolean).reduce((bounds, table) => {
        const tableX = Number(table.position_x) || 0;
        const tableY = Number(table.position_y) || 0;

        return {
            width: Math.max(bounds.width, tableX + TABLE_SIZE + MAP_PADDING),
            height: Math.max(bounds.height, tableY + TABLE_SIZE + MAP_PADDING),
        };
    }, { width: 720, height: 480 });

    const fetchTables = async () => {
        try {
            const res = await axios.get(API_URL + 'master/tables', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                const rawTables = Array.isArray(res.data.data) ? res.data.data : [];
                const sortedTables = sortTablesByNumber(rawTables);
                const normalizedTables = normalizeTablePositions(sortedTables);
                setTables(normalizedTables);

                const originalById = new Map(rawTables.map((table) => [String(table.id), table]));
                const changedTables = normalizedTables.filter((table) => {
                    const originalTable = originalById.get(String(table.id));
                    return Number(originalTable?.position_x) !== Number(table.position_x)
                        || Number(originalTable?.position_y) !== Number(table.position_y);
                });

                if (changedTables.length) {
                    await persistTablePositions(changedTables);
                }
            }
        } catch (error) {
            console.error("Error fetching tables:", error);
        }
    };

    // --- LOGIKA DRAG & DROP ---
    const handleDrag = (e, tableId) => {
        if (!isEditing) return;

        const pointerPosition = getRawPositionFromPointer(e);
        if (!pointerPosition) return;

        const snappedPosition = getSnappedPosition(pointerPosition.rawX, pointerPosition.rawY, tableId);
        setDragPreview({ id: tableId, position_x: snappedPosition.x, position_y: snappedPosition.y });
    };

    const handleDragEnd = (e, tableId) => {
        if (!isEditing) return;

        const pointerPosition = getRawPositionFromPointer(e);
        if (!pointerPosition) return;

        const rawX = pointerPosition.rawX;
        const rawY = pointerPosition.rawY;
        const snappedPosition = getSnappedPosition(rawX, rawY, tableId);
        let x = snappedPosition.x;
        let y = snappedPosition.y;
        setDragPreview(null);

        // Boundary Check
        if (x < 0) x = 0;
        if (y < 0) y = 0;

        // Update Optimistic
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, position_x: x, position_y: y } : t));
    };

    const handleFinishArrange = async () => {
        const normalizedCurrentTables = normalizeTablePositions([...displayedTables]);

        setDragPreview(null);
        showLoading('Menyimpan posisi meja...');

        try {
            setTables(normalizedCurrentTables);
            await persistTablePositions(normalizedCurrentTables);
            await fetchTables();
            setIsEditing(false);
            setMapRenderKey((prev) => prev + 1);
            showAlert('success', 'Tersimpan', 'Posisi meja berhasil disimpan.');
        } catch (error) {
            await fetchTables();
            showAlert('error', 'Gagal', 'Posisi meja gagal disimpan. Coba lagi.');
        } finally {
            hideLoading();
        }
    };

    const handleAutoArrange = async () => {
        if (!tables.length) return;

        const containerWidth = containerRef.current?.clientWidth || 720;
        const columns = Math.max(1, Math.floor((containerWidth - MAP_PADDING) / SNAP_STEP));
        const sortedTables = sortTablesByNumber(tables);

        const arrangedTables = sortedTables.map((table, index) => ({
            ...table,
            position_x: (index % columns) * SNAP_STEP,
            position_y: Math.floor(index / columns) * SNAP_STEP,
        }));

        setDragPreview(null);
        setTables(arrangedTables);
        showLoading('Merapikan denah...');

        try {
            await persistTablePositions(arrangedTables);

            showAlert('success', 'Berhasil', 'Posisi meja dirapikan otomatis.');
        } catch (error) {
            fetchTables();
            showAlert('error', 'Gagal', 'Gagal merapikan posisi meja.');
        } finally {
            hideLoading();
        }
    };

    const handleAddTable = async (e) => {
        e.preventDefault();
        showLoading('Menyimpan...');
        try {
            const initialPosition = getSnappedPosition(0, 0);

            await axios.post(API_URL + 'master/tables', {
                ...newTable,
                position_x: initialPosition.x,
                position_y: initialPosition.y,
            }, { headers: { Authorization: `Bearer ${token}` } });

            showAlert('success', 'Berhasil', 'Meja ditambahkan');
            setShowAddModal(false);
            setNewTable({ table_number: '', capacity: 4 });
            fetchTables();
        } catch (error) {
            showAlert('error', 'Gagal', 'Gagal menambah meja');
        } finally {
            hideLoading();
        }
    };

    const handleDeleteTable = (id) => {
        showConfirm('Hapus Meja?', 'Data meja akan hilang permanen.', async () => {
            try {
                await axios.delete(API_URL + 'master/tables&id=' + id, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchTables();
                showAlert('success', 'Terhapus', 'Meja dihapus.');
            } catch (error) {
                showAlert('error', 'Gagal', 'Gagal menghapus.');
            }
        });
    };

    // --- LOGIKA QR CODE ---
    const handleShowQR = (table) => {
        // Generate URL QR Code
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${window.location.origin}/order?table_id=${table.id}`)}`;
        const orderUrl = `${window.location.origin}/order?table_id=${table.id}`;

        setSelectedTableQR({ ...table, qrUrl, orderUrl });
        setShowQRModal(true);
    };

    const downloadQR = async () => {
        if (!selectedTableQR) return;
        try {
            const response = await fetch(selectedTableQR.qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QR_Meja_${selectedTableQR.table_number}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            alert("Gagal download gambar");
        }
    };

    // --- LOGIKA KOSONGKAN MEJA (Clear Table) ---
    const handleClearTable = (table) => {
        if (isEditing) return; // Jangan trigger saat edit

        showConfirm(
            `Kosongkan Meja ${table.table_number}?`,
            'Pastikan pelanggan sudah selesai dan meja sudah bersih.',
            async () => {
                showLoading('Mengupdate...');
                try {
                    await axios.post(API_URL + 'master/tables/status', {
                        id: table.id,
                        status: 'available' // Set kembali ke available
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    fetchTables(); // Refresh data
                    showAlert('success', 'Meja Kosong', `Meja ${table.table_number} siap digunakan kembali.`);
                } catch (error) {
                    showAlert('error', 'Gagal', 'Gagal update status meja.');
                } finally {
                    hideLoading();
                }
            }
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'occupied': return 'bg-red-100 border-red-300 text-red-700 shadow-red-100';
            case 'reserved': return 'bg-yellow-100 border-yellow-300 text-yellow-700 shadow-yellow-100';
            default: return 'bg-white border-gray-200 text-gray-700 hover:border-brand-primary/50';
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">

            {/* HEADER & TOOLS */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 shrink-0 gap-4">
                <div>
                    <h3 className="text-brand-darkest font-bold text-2xl flex items-center gap-2">
                        <Map size={24} /> Manajemen Meja
                    </h3>
                    <p className="text-gray-500 text-sm">Atur denah dan cetak QR Code untuk pesanan mandiri.</p>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                    <button
                        onClick={() => setViewMode('map')}
                        className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold ${viewMode === 'map' ? 'bg-white shadow text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Map size={16} /> Denah
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold ${viewMode === 'grid' ? 'bg-white shadow text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutGrid size={16} /> List
                    </button>
                </div>

                <div className="flex gap-3">
                    {viewMode === 'map' && (
                        isEditing ? (
                            <>
                                <button
                                    onClick={handleAutoArrange}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-darkest text-white rounded-xl hover:bg-black font-medium shadow-lg transition-transform active:scale-95"
                                >
                                    <LayoutGrid size={18} /> Rapikan Otomatis
                                </button>
                                <button
                                    onClick={handleFinishArrange}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-lg transition-transform active:scale-95"
                                >
                                    <Save size={18} /> Selesai Atur
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                            >
                                <Move size={18} /> Atur Posisi Meja
                            </button>
                        )
                    )}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-dark font-medium shadow-lg shadow-brand-primary/20 transition-transform active:scale-95"
                    >
                        <Plus size={18} /> Tambah Meja
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 relative overflow-hidden shadow-inner group">

                {/* Grid Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                {viewMode === 'map' ? (
                    // --- MODE DENAH (MAP) ---
                    <div key={mapRenderKey} className="w-full h-full overflow-auto" ref={containerRef}>
                        <div className="relative" style={{ width: `${mapBounds.width}px`, height: `${mapBounds.height}px` }}>
                            {tables.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                                    <div className="mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-dark/20 border border-brand-primary/20 flex items-center justify-center shadow-inner">
                                        <Utensils size={42} className="text-brand-darkest/70" />
                                    </div>
                                    <p>Belum ada meja. Tambahkan sekarang.</p>
                                </div>
                            )}

                            {displayedTables.map((table) => (
                                <motion.div
                                    key={`${table.id}-${isEditing ? 'edit' : 'view'}`}
                                    drag={isEditing}
                                    dragMomentum={false}
                                    dragElastic={0}
                                    onDragStart={() => setDragPreview({ id: table.id, position_x: Number(table.position_x) || 0, position_y: Number(table.position_y) || 0 })}
                                    onDrag={(e) => handleDrag(e, table.id)}
                                    onDragEnd={(e) => handleDragEnd(e, table.id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileDrag={{ scale: 1.1, zIndex: 50, opacity: 0.8, cursor: 'grabbing' }}
                                    animate={isEditing ? undefined : { x: 0, y: 0, scale: 1 }}
                                    transition={isEditing ? undefined : { duration: 0 }}
                                    style={{
                                        left: `${Number(table.position_x) || 0}px`,
                                        top: `${Number(table.position_y) || 0}px`,
                                    }}
                                    className={`absolute w-24 h-24 rounded-2xl shadow-md flex flex-col items-center justify-center border-2 transition-all ${getStatusColor(table.status)} ${isEditing ? 'cursor-grab ring-2 ring-brand-primary/50 ring-offset-2' : 'cursor-pointer'}`}
                                    onClick={() => !isEditing && handleShowQR(table)}
                                >
                                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-brand-primary/15 border border-brand-primary/25 text-brand-darkest flex items-center justify-center shadow-sm">
                                        <Utensils size={10} />
                                    </div>
                                    <span className="text-2xl font-bold mb-1">{table.table_number}</span>

                                    {table.status === 'occupied' ? (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-bold uppercase">Terisi</span>
                                            {/* Tombol Clear (Hanya muncul jika terisi & tidak edit) */}
                                            {!isEditing && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleClearTable(table); }}
                                                    className="mt-1 px-2 py-0.5 bg-white/80 rounded-full text-[9px] font-bold text-red-600 hover:bg-white shadow-sm flex items-center gap-1"
                                                    title="Kosongkan Meja"
                                                >
                                                    <CheckCircle size={8} /> Selesai
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-[10px] opacity-60 bg-black/5 px-2 py-0.5 rounded-full">
                                            <Users size={10} /> {table.capacity}
                                        </div>
                                    )}

                                    {/* Tombol Hapus (Mode Edit) */}
                                    {isEditing && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-700 shadow-sm z-10"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}

                                    {/* Status Indicator Dot */}
                                    {!isEditing && (
                                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${table.status === 'occupied' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                                    )}
                                </motion.div>
                            ))}

                            {isEditing && dragPreview && (
                                <div
                                    className="absolute rounded-2xl border-2 border-dashed border-brand-primary bg-brand-primary/10 pointer-events-none"
                                    style={{
                                        width: `${TABLE_SIZE}px`,
                                        height: `${TABLE_SIZE}px`,
                                        left: `${dragPreview.position_x}px`,
                                        top: `${dragPreview.position_y}px`,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    // --- MODE LIST (GRID) ---
                    <div className="h-full overflow-x-auto overflow-y-auto p-6">
                        <div className="inline-grid min-w-max grid-flow-col auto-cols-[11rem] grid-rows-2 gap-4 content-start">
                            {displayedTables.map((table) => (
                                <div key={table.id} className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 relative group ${getStatusColor(table.status)}`}>
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary/15 to-brand-dark/10 border border-brand-primary/20 flex items-center justify-center text-brand-darkest relative shadow-sm">
                                        <Utensils size={20} />
                                        {table.status === 'occupied' && (
                                            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-lg whitespace-nowrap">Meja {table.table_number}</h4>
                                        <p className="text-xs text-gray-500">{table.capacity} Orang</p>
                                    </div>
                                    <div className="flex flex-col gap-2 mt-2 w-full">
                                        {table.status === 'occupied' ? (
                                            <button onClick={() => handleClearTable(table)} className="w-full py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-700">
                                                <CheckCircle size={12} /> Kosongkan
                                            </button>
                                        ) : (
                                            <div className="flex gap-2 w-full">
                                                <button onClick={() => handleShowQR(table)} className="flex-1 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-brand-dark">
                                                    <QrCode size={12} /> QR
                                                </button>
                                                <button onClick={() => handleDeleteTable(table.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL TAMBAH MEJA */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-800">Tambah Meja</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddTable} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor Meja</label>
                                <input
                                    type="text" required autoFocus
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-lg"
                                    placeholder="A1"
                                    value={newTable.table_number} onChange={e => setNewTable({ ...newTable, table_number: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kapasitas (Pax)</label>
                                <div className="flex items-center gap-4">
                                    <button type="button" onClick={() => setNewTable(p => ({ ...p, capacity: Math.max(1, p.capacity - 1) }))} className="p-2 bg-gray-100 rounded-lg"><X size={16} className="rotate-45" /></button>
                                    <input
                                        type="number" required
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary outline-none text-center font-bold text-lg"
                                        value={newTable.capacity} onChange={e => setNewTable({ ...newTable, capacity: parseInt(e.target.value) })}
                                    />
                                    <button type="button" onClick={() => setNewTable(p => ({ ...p, capacity: p.capacity + 1 }))} className="p-2 bg-gray-100 rounded-lg"><Plus size={16} /></button>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Batal</button>
                                <button type="submit" className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg shadow-brand-primary/20">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL QR CODE DETAIL */}
            {showQRModal && selectedTableQR && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-brand-primary p-6 text-center relative">
                            <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 p-1 rounded-full"><X size={20} /></button>
                            <h3 className="text-white font-bold text-2xl mb-1">Meja {selectedTableQR.table_number}</h3>
                            <p className="text-brand-accent text-sm">Scan untuk pesan menu</p>
                        </div>
                        <div className="p-8 flex flex-col items-center">
                            <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-100 mb-6">
                                <img src={selectedTableQR.qrUrl} alt="QR Code" className="w-48 h-48 object-contain rounded-lg" />
                            </div>

                            {/* HANYA TOMBOL SIMPAN YANG TAMPIL */}
                            <div className="w-full">
                                <button onClick={downloadQR} className="w-full flex items-center justify-center gap-2 py-3 bg-brand-darkest text-white rounded-xl font-bold hover:bg-gray-900 transition-colors shadow-lg active:scale-95 transform">
                                    <Download size={18} /> Simpan QR Code
                                </button>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 w-full text-center">
                                <p className="text-xs text-gray-400 mb-1">Link Pesanan:</p>
                                <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-600 break-all select-all block cursor-text">
                                    {selectedTableQR.orderUrl}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}