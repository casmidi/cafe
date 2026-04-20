import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, BarChart3, User, UtensilsCrossed, Printer, FileSpreadsheet, FileDown, Filter } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

const REPORT_ROUTES = {
    sales: '/reports/sales-period',
    cashier: '/reports/cashier',
    topMenu: '/reports/top-menu',
};

const SHIFT_OPTIONS = [
    { value: 'all', label: 'Semua Shift' },
    { value: 'A', label: 'Shift A (06:00 - 13:59)' },
    { value: 'B', label: 'Shift B (14:00 - 21:59)' },
    { value: 'C', label: 'Shift C (22:00 - 05:59)' },
];

const toDateInputValue = (date) => date.toISOString().split('T')[0];

const getShiftLabelFromDateTime = (dateTimeValue) => {
    if (!dateTimeValue) return 'N/A';

    const date = new Date(dateTimeValue);
    const hour = date.getHours();

    if (hour >= 6 && hour < 14) return 'A';
    if (hour >= 14 && hour < 22) return 'B';
    return 'C';
};

const formatCurrency = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('id-ID');
};

const formatDateOnly = (value) => {
    if (!value) return '-';

    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
};

const formatDateInputDisplay = (value) => {
    if (!value) return '-- -- ----';

    const [year, month, day] = String(value).split('-');
    if (!year || !month || !day) return value;

    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
};

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function DateDisplayField({ value, onChange }) {
    const inputRef = useRef(null);

    const openPicker = () => {
        if (!inputRef.current) return;

        if (typeof inputRef.current.showPicker === 'function') {
            inputRef.current.showPicker();
            return;
        }

        inputRef.current.click();
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 min-w-[92px]">{formatDateInputDisplay(value)}</span>
            <button
                type="button"
                onClick={openPicker}
                className="w-7 h-7 rounded-md hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors"
                aria-label="Pilih tanggal"
            >
                <Calendar size={15} />
            </button>
            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={onChange}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
            />
        </div>
    );
}

export default function Reports() {
    const location = useLocation();
    const navigate = useNavigate();
    const { showLoading, hideLoading, showAlert } = useUIStore();

    const token = localStorage.getItem('token');

    const [salesStartDate, setSalesStartDate] = useState(toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [salesEndDate, setSalesEndDate] = useState(toDateInputValue(new Date()));
    const [cashierStartDate, setCashierStartDate] = useState(toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [cashierEndDate, setCashierEndDate] = useState(toDateInputValue(new Date()));
    const [selectedShift, setSelectedShift] = useState('all');

    const [salesData, setSalesData] = useState({ daily: [], top_products: [] });
    const [cashierRawData, setCashierRawData] = useState([]);
    const [topMenuData, setTopMenuData] = useState([]);

    const activeReport = useMemo(() => {
        if (location.pathname === REPORT_ROUTES.cashier) return 'cashier';
        if (location.pathname === REPORT_ROUTES.topMenu) return 'topMenu';
        return 'sales';
    }, [location.pathname]);

    useEffect(() => {
        if (location.pathname === '/reports') {
            navigate(REPORT_ROUTES.sales, { replace: true });
        }
    }, [location.pathname, navigate]);

    useEffect(() => {
        if (!token) return;

        if (activeReport === 'sales') {
            fetchSalesReport();
            return;
        }

        if (activeReport === 'cashier') {
            fetchCashierReport();
            return;
        }

        fetchTopMenuReport();
    }, [activeReport, salesStartDate, salesEndDate, cashierStartDate, cashierEndDate, token]);

    const fetchSalesReport = async () => {
        showLoading('Memuat laporan penjualan...');

        try {
            const response = await axios.get(`${API_URL}reports/sales&start_date=${salesStartDate}&end_date=${salesEndDate}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data?.status) {
                setSalesData(response.data.data || { daily: [], top_products: [] });
            } else {
                setSalesData({ daily: [], top_products: [] });
            }
        } catch (error) {
            console.error(error);
            showAlert('error', 'Gagal', 'Gagal memuat laporan penjualan.');
        } finally {
            hideLoading();
        }
    };

    const fetchCashierReport = async () => {
        showLoading('Memuat laporan per kasir...');

        try {
            const response = await axios.get(`${API_URL}shift/history`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data?.status) {
                setCashierRawData(response.data.data || []);
            } else {
                setCashierRawData([]);
            }
        } catch (error) {
            console.error(error);
            showAlert('error', 'Gagal', 'Gagal memuat laporan per kasir.');
        } finally {
            hideLoading();
        }
    };

    const fetchTopMenuReport = async () => {
        showLoading('Memuat laporan menu terlaris...');

        try {
            const [menuPerfRes, productsRes] = await Promise.all([
                axios.get(`${API_URL}analytics/menu`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}master/products`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const menuPerf = menuPerfRes.data?.status ? (menuPerfRes.data.data || []) : [];
            const products = productsRes.data?.status ? (productsRes.data.data || []) : [];

            const perfMapByName = new Map(
                menuPerf.map((item) => [
                    String(item.name || '').trim().toLowerCase(),
                    {
                        qty: Number(item.qty || 0),
                        revenue: Number(item.revenue || 0),
                    },
                ])
            );

            const merged = products.map((product) => {
                const key = String(product.name || '').trim().toLowerCase();
                const perf = perfMapByName.get(key);

                return {
                    name: product.name,
                    qty_sold: perf?.qty || 0,
                    revenue: perf?.revenue || 0,
                };
            });

            merged.sort((first, second) => {
                if (second.qty_sold !== first.qty_sold) return second.qty_sold - first.qty_sold;
                return String(first.name).localeCompare(String(second.name), 'id');
            });

            setTopMenuData(merged);
        } catch (error) {
            console.error(error);
            showAlert('error', 'Gagal', 'Gagal memuat laporan menu terlaris.');
        } finally {
            hideLoading();
        }
    };

    const cashierData = useMemo(() => {
        return cashierRawData
            .filter((item) => {
                const startValue = item.start_time || item.created_at;
                if (!startValue) return false;

                const dateOnly = toDateInputValue(new Date(startValue));
                if (dateOnly < cashierStartDate || dateOnly > cashierEndDate) return false;

                const shiftLabel = getShiftLabelFromDateTime(startValue);
                if (selectedShift !== 'all' && shiftLabel !== selectedShift) return false;

                return true;
            })
            .map((item) => {
                const salesCash = Number(item.total_sales_cash || 0);
                const salesNonCash = Number(item.total_sales_non_cash || 0);

                return {
                    id: item.id,
                    shift_label: getShiftLabelFromDateTime(item.start_time || item.created_at),
                    cashier_name: item.user_name || 'N/A',
                    start_time: item.start_time,
                    end_time: item.end_time,
                    sales_cash: salesCash,
                    sales_non_cash: salesNonCash,
                    total_sales: salesCash + salesNonCash,
                    status: item.status,
                };
            })
            .sort((first, second) => new Date(second.start_time || 0).getTime() - new Date(first.start_time || 0).getTime());
    }, [cashierRawData, cashierStartDate, cashierEndDate, selectedShift]);

    const salesSummary = useMemo(() => {
        const totalRevenue = salesData.daily.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const totalTransactions = salesData.daily.reduce((sum, item) => sum + Number(item.count || 0), 0);

        return {
            totalRevenue,
            totalTransactions,
        };
    }, [salesData.daily]);

    const cashierSummary = useMemo(() => {
        const totalSales = cashierData.reduce((sum, item) => sum + Number(item.total_sales || 0), 0);
        const totalShifts = cashierData.length;

        return {
            totalSales,
            totalShifts,
        };
    }, [cashierData]);

    const topMenuSummary = useMemo(() => {
        const totalQty = topMenuData.reduce((sum, item) => sum + Number(item.qty_sold || 0), 0);
        const totalRevenue = topMenuData.reduce((sum, item) => sum + Number(item.revenue || 0), 0);

        return {
            totalQty,
            totalRevenue,
        };
    }, [topMenuData]);

    const exportToExcel = (fileName, columns, rows) => {
        if (!rows.length) {
            showAlert('warning', 'Kosong', 'Data laporan masih kosong.');
            return;
        }

        const excelRows = rows.map((row) => {
            const mapped = {};
            columns.forEach((column) => {
                mapped[column.label] = row[column.key];
            });
            return mapped;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    };

    const exportToPdf = (title, fileName, columns, rows) => {
        if (!rows.length) {
            showAlert('warning', 'Kosong', 'Data laporan masih kosong.');
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(14);
        doc.text(title, 14, 14);

        autoTable(doc, {
            startY: 20,
            head: [columns.map((column) => column.label)],
            body: rows.map((row) => columns.map((column) => row[column.key])),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [217, 41, 41] },
        });

        doc.save(`${fileName}.pdf`);
    };

    const printTable = (title, columns, rows) => {
        if (!rows.length) {
            showAlert('warning', 'Kosong', 'Data laporan masih kosong.');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) return;

        const tableHeader = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
        const tableRows = rows
            .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join('')}</tr>`)
            .join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>${escapeHtml(title)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; }
                        h1 { font-size: 18px; margin-bottom: 16px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; text-align: left; }
                        th { background: #f3f4f6; }
                    </style>
                </head>
                <body>
                    <h1>${escapeHtml(title)}</h1>
                    <table>
                        <thead>
                            <tr>${tableHeader}</tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const salesColumns = [
        { key: 'date', label: 'Tanggal' },
        { key: 'transaction_count', label: 'Jumlah Transaksi' },
        { key: 'revenue', label: 'Omzet' },
    ];

    const salesRows = salesData.daily.map((item) => ({
        date: formatDateOnly(item.date),
        transaction_count: Number(item.count || 0),
        revenue: formatCurrency(item.total),
    }));

    const cashierColumns = [
        { key: 'shift_label', label: 'Shift' },
        { key: 'cashier_name', label: 'Kasir' },
        { key: 'start_time', label: 'Mulai Shift' },
        { key: 'end_time', label: 'Tutup Shift' },
        { key: 'sales_cash', label: 'Penjualan Cash' },
        { key: 'sales_non_cash', label: 'Penjualan Non Cash' },
        { key: 'total_sales', label: 'Total Penjualan' },
        { key: 'status', label: 'Status' },
    ];

    const cashierRows = cashierData.map((item) => ({
        shift_label: item.shift_label,
        cashier_name: item.cashier_name,
        start_time: formatDateTime(item.start_time),
        end_time: formatDateTime(item.end_time),
        sales_cash: formatCurrency(item.sales_cash),
        sales_non_cash: formatCurrency(item.sales_non_cash),
        total_sales: formatCurrency(item.total_sales),
        status: String(item.status || '').toUpperCase(),
    }));

    const topMenuColumns = [
        { key: 'rank', label: 'Peringkat' },
        { key: 'name', label: 'Nama Menu' },
        { key: 'qty_sold', label: 'Jumlah Terjual' },
        { key: 'revenue', label: 'Omzet' },
    ];

    const topMenuRows = topMenuData.map((item, index) => ({
        rank: index + 1,
        name: item.name,
        qty_sold: Number(item.qty_sold || 0),
        revenue: formatCurrency(item.revenue),
    }));

    const renderActionButtons = (title, fileName, columns, rows) => (
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => printTable(title, columns, rows)}
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
                <Printer size={16} /> Print
            </button>
            <button
                onClick={() => exportToExcel(fileName, columns, rows)}
                className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold text-emerald-700 flex items-center gap-2"
            >
                <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button
                onClick={() => exportToPdf(title, fileName, columns, rows)}
                className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-sm font-semibold text-rose-700 flex items-center gap-2"
            >
                <FileDown size={16} /> Export PDF
            </button>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-2xl font-extrabold text-brand-darkest">Laporan</h3>
                <p className="text-sm text-gray-500 mt-1">Semua laporan dapat di-print dan di-export ke Excel/PDF.</p>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        onClick={() => navigate(REPORT_ROUTES.sales)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border ${activeReport === 'sales' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <BarChart3 size={16} /> Per Periode
                    </button>
                    <button
                        onClick={() => navigate(REPORT_ROUTES.cashier)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border ${activeReport === 'cashier' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <User size={16} /> Per Shift
                    </button>
                    <button
                        onClick={() => navigate(REPORT_ROUTES.topMenu)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border ${activeReport === 'topMenu' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <UtensilsCrossed size={16} /> Barang Terlaris
                    </button>
                </div>
            </div>

            {activeReport === 'sales' && (
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
                            <Calendar size={16} className="text-gray-400 ml-1" />
                            <DateDisplayField value={salesStartDate} onChange={(event) => setSalesStartDate(event.target.value)} />
                            <span className="text-gray-400">s/d</span>
                            <DateDisplayField value={salesEndDate} onChange={(event) => setSalesEndDate(event.target.value)} />
                        </div>

                        {renderActionButtons(
                            `Laporan Penjualan ${formatDateOnly(salesStartDate)} - ${formatDateOnly(salesEndDate)}`,
                            `laporan_penjualan_${salesStartDate}_${salesEndDate}`,
                            salesColumns,
                            salesRows
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold uppercase text-gray-500">Total Omzet</p>
                            <h4 className="text-2xl font-extrabold text-brand-darkest mt-1">{formatCurrency(salesSummary.totalRevenue)}</h4>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold uppercase text-gray-500">Total Transaksi</p>
                            <h4 className="text-2xl font-extrabold text-brand-darkest mt-1">{salesSummary.totalTransactions}</h4>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 font-bold text-gray-800">Detail Penjualan Harian</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Tanggal</th>
                                        <th className="px-5 py-3 text-left">Transaksi</th>
                                        <th className="px-5 py-3 text-left">Omzet</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {salesRows.map((row, index) => (
                                        <tr key={`sales-${index}`}>
                                            <td className="px-5 py-3">{row.date}</td>
                                            <td className="px-5 py-3">{row.transaction_count}</td>
                                            <td className="px-5 py-3 font-semibold text-gray-800">{row.revenue}</td>
                                        </tr>
                                    ))}
                                    {salesRows.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-8 text-center text-gray-400">Belum ada data pada periode ini.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeReport === 'cashier' && (
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
                                <Calendar size={16} className="text-gray-400 ml-1" />
                                <DateDisplayField value={cashierStartDate} onChange={(event) => setCashierStartDate(event.target.value)} />
                                <span className="text-gray-400">s/d</span>
                                <DateDisplayField value={cashierEndDate} onChange={(event) => setCashierEndDate(event.target.value)} />
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
                                <Filter size={16} className="text-gray-400 ml-1" />
                                <select value={selectedShift} onChange={(event) => setSelectedShift(event.target.value)} className="bg-transparent text-sm outline-none text-gray-700">
                                    {SHIFT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {renderActionButtons(
                            `Laporan Per Kasir ${formatDateOnly(cashierStartDate)} - ${formatDateOnly(cashierEndDate)} (${selectedShift === 'all' ? 'Semua Shift' : `Shift ${selectedShift}`})`,
                            `laporan_per_kasir_${cashierStartDate}_${cashierEndDate}_${selectedShift}`,
                            cashierColumns,
                            cashierRows
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold uppercase text-gray-500">Total Penjualan</p>
                            <h4 className="text-2xl font-extrabold text-brand-darkest mt-1">{formatCurrency(cashierSummary.totalSales)}</h4>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold uppercase text-gray-500">Jumlah Shift</p>
                            <h4 className="text-2xl font-extrabold text-brand-darkest mt-1">{cashierSummary.totalShifts}</h4>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 font-bold text-gray-800">Detail Laporan Per Kasir</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Shift</th>
                                        <th className="px-5 py-3 text-left">Kasir</th>
                                        <th className="px-5 py-3 text-left">Mulai</th>
                                        <th className="px-5 py-3 text-left">Tutup</th>
                                        <th className="px-5 py-3 text-left">Cash</th>
                                        <th className="px-5 py-3 text-left">Non Cash</th>
                                        <th className="px-5 py-3 text-left">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {cashierRows.map((row, index) => (
                                        <tr key={`cashier-${index}`}>
                                            <td className="px-5 py-3 font-semibold">{row.shift_label}</td>
                                            <td className="px-5 py-3">{row.cashier_name}</td>
                                            <td className="px-5 py-3">{row.start_time}</td>
                                            <td className="px-5 py-3">{row.end_time}</td>
                                            <td className="px-5 py-3">{row.sales_cash}</td>
                                            <td className="px-5 py-3">{row.sales_non_cash}</td>
                                            <td className="px-5 py-3 font-semibold text-gray-800">{row.total_sales}</td>
                                        </tr>
                                    ))}
                                    {cashierRows.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-8 text-center text-gray-400">Belum ada data kasir pada filter ini.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeReport === 'topMenu' && (
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Diurutkan dari menu paling laris sampai yang belum terjual.</p>
                        </div>

                        {renderActionButtons(
                            'Laporan Menu Terlaris',
                            'laporan_menu_terlaris',
                            topMenuColumns,
                            topMenuRows
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold uppercase text-gray-500">Total Qty Terjual</p>
                            <h4 className="text-2xl font-extrabold text-brand-darkest mt-1">{topMenuSummary.totalQty}</h4>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold uppercase text-gray-500">Total Omzet Menu</p>
                            <h4 className="text-2xl font-extrabold text-brand-darkest mt-1">{formatCurrency(topMenuSummary.totalRevenue)}</h4>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 font-bold text-gray-800">Peringkat Menu</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-5 py-3 text-left">#</th>
                                        <th className="px-5 py-3 text-left">Nama Menu</th>
                                        <th className="px-5 py-3 text-left">Jumlah Terjual</th>
                                        <th className="px-5 py-3 text-left">Omzet</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {topMenuRows.map((row) => (
                                        <tr key={`menu-${row.rank}-${row.name}`}>
                                            <td className="px-5 py-3 font-semibold">{row.rank}</td>
                                            <td className="px-5 py-3">{row.name}</td>
                                            <td className="px-5 py-3">{row.qty_sold}</td>
                                            <td className="px-5 py-3 font-semibold text-gray-800">{row.revenue}</td>
                                        </tr>
                                    ))}
                                    {topMenuRows.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-8 text-center text-gray-400">Belum ada data menu.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
