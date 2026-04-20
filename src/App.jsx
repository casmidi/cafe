import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import axios from 'axios';
import { API_URL } from './config';
import useUIStore from './store/useUIStore';
import { FALLBACK_LOGO_URL, normalizeLogoUrl } from './utils/logoUrl';

// Import Semua Halaman
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const Shift = lazy(() => import('./pages/Shift'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const Orders = lazy(() => import('./pages/Orders'));
const Inventory = lazy(() => import('./pages/Inventory'));
const StockOpname = lazy(() => import('./pages/StockOpname'));
const Purchasing = lazy(() => import('./pages/Purchasing'));
const Receiving = lazy(() => import('./pages/Receiving'));
const Reports = lazy(() => import('./pages/Reports'));
const Menu = lazy(() => import('./pages/Menu'));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));
const Customers = lazy(() => import('./pages/Customers'));
const Discounts = lazy(() => import('./pages/Discounts'));
const TableLayout = lazy(() => import('./pages/TableLayout'));
const QROrder = lazy(() => import('./pages/QROrder'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Payroll = lazy(() => import('./pages/Payroll'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Expenses = lazy(() => import('./pages/Expenses'));
const EmployeeForgotPassword = lazy(() => import('./pages/EmployeeForgotPassword'));
const Analytics = lazy(() => import('./pages/Analytics'));

// Page Baru
import Activation from './pages/Activation';

// Member Area
const CustomerLogin = lazy(() => import('./pages/CustomerLogin'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const CustomerRegister = lazy(() => import('./pages/CustomerRegister'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

import Layout from './components/Layout';
import GlobalModals from './components/GlobalModals';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

function App() {
  const { setAppSettings } = useUIStore();

  // STATE LISENSI
  const [isLicensed, setIsLicensed] = useState(null); // null = checking, true = active, false = inactive

  useEffect(() => {
    checkLicenseAndSettings();
  }, []);

  const checkLicenseAndSettings = async () => {
    // BYPASS LICENSE
    setIsLicensed(true);

    try {
      const infoRes = await axios.get(API_URL + 'public/info');
      if (infoRes.data.status) {
        const { name, logo_url } = infoRes.data.data;
        const normalizedUrl = normalizeLogoUrl(logo_url || FALLBACK_LOGO_URL);

        // Simpan ke localStorage untuk fallback saat reloadlokal atau loading
        localStorage.setItem('cachedOutletInfo', JSON.stringify({
          name: name,
          logo_url: normalizedUrl,
          timestamp: Date.now()
        }));

        // Update global app settings
        setAppSettings({
          name: name,
          logo_url: normalizedUrl
        });
      }
    } catch (error) {
      console.error(error);

      // Fallback: coba ambil dari localStorage cache
      const cached = localStorage.getItem('cachedOutletInfo');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setAppSettings({
            name: data.name,
            logo_url: data.logo_url
          });
        } catch (e) {
          console.error('Failed to parse cached outlet info:', e);
        }
      }
    }
  };
  // const checkLicenseAndSettings = async () => {
  //   try {
  //       // 1. Cek Lisensi
  //       const licRes = await axios.get(API_URL + 'license/check');
  //       if (licRes.data.activated) {
  //           setIsLicensed(true);

  //           // 2. Load Info Publik (Jika lisensi aktif)
  //           const infoRes = await axios.get(API_URL + 'public/info');
  //           if (infoRes.data.status) {
  //               const { name, logo_url } = infoRes.data.data;
  //               setAppSettings({
  //                   name: name,
  //                   logo_url: logo_url || '/taskora-logo.png' 
  //               });
  //           }
  //       } else {
  //           setIsLicensed(false);
  //       }
  //   } catch (error) {
  //       console.error("Gagal cek sistem:", error);
  //       setIsLicensed(false); // Default block jika error
  //   }
  // };

  // Tampilkan Loading Putih saat cek lisensi & load info public
  if (isLicensed === null) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Checking License...</div>;
  }

  // JIKA BELUM AKTIVASI -> KUNCI APLIKASI
  if (isLicensed === false) {
    return <Activation />;
  }

  // JIKA SUDAH AKTIF -> RENDER NORMAL
  return (
    <Router>
      <GlobalModals />
      <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>}>
        <Routes>
          {/* Route Publik */}
          <Route path="/order" element={<QROrder />} />
          <Route path="/order-status" element={<OrderStatus />} /> {/* ROUTE BARU */}

          {/* Route Auth Karyawan */}
          <Route path="/auth/forgot" element={<EmployeeForgotPassword />} />

          {/* Route Member Area */}
          <Route path="/member/login" element={<CustomerLogin />} />
          <Route path="/member/register" element={<CustomerRegister />} />
          <Route path="/member/forgot-password" element={<ForgotPassword />} />
          <Route path="/member/dashboard" element={<CustomerDashboard />} />

          {/* Route Admin/Kasir */}
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/shift" element={<ProtectedRoute><Shift /></ProtectedRoute>} />
          <Route path="/kitchen" element={<ProtectedRoute><Kitchen /></ProtectedRoute>} />
          <Route path="/tables" element={<ProtectedRoute><TableLayout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/inventory/opname" element={<ProtectedRoute><StockOpname /></ProtectedRoute>} />
          <Route path="/purchasing" element={<ProtectedRoute><Purchasing /></ProtectedRoute>} />
          <Route path="/receiving" element={<ProtectedRoute><Receiving /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
          <Route path="/discounts" element={<ProtectedRoute><Discounts /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* HRM MODULE */}
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App;