import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AdminRoute from './components/AdminRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import MaintenanceMode from './components/MaintenanceMode.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StoreUnavailable from './components/StoreUnavailable.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Cart from './pages/Cart.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Gifts from './pages/Gifts.jsx';
import Investments from './pages/Investments.jsx';
import Login from './pages/Login.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import ProjectSuspended from './pages/ProjectSuspended.jsx';
import Register from './pages/Register.jsx';
import Store from './pages/Store.jsx';

const PortalEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { platform } = useSettings();
  const openSupport = new URLSearchParams(location.search).get('support') === '1';

  if (platform?.maintenanceMode && !openSupport) {
    return <MaintenanceMode />;
  }

  return <ProjectSuspended openSupport={openSupport} onEnterSite={() => navigate('/login')} />;
};

const StoreGuard = ({ children }) => {
  const { user } = useAuth();
  const { platform } = useSettings();

  if (!user?.isAdmin && platform?.storeEnabled === false) {
    return <StoreUnavailable />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <CartProvider>
            <ToastProvider>
            <Routes>
              <Route path="/" element={<PortalEntry />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/trading" element={<Investments />} />
                <Route path="/store" element={<StoreGuard><Store /></StoreGuard>} />
                <Route path="/store/:id" element={<StoreGuard><ProductDetails /></StoreGuard>} />
                <Route path="/cart" element={<StoreGuard><Cart /></StoreGuard>} />
                <Route path="/shopping" element={<Navigate to="/store" replace />} />
                <Route path="/investments" element={<Navigate to="/trading" replace />} />
                <Route path="/games" element={<Navigate to="/trading" replace />} />
                <Route path="/tasks" element={<Navigate to="/trading" replace />} />
                <Route path="/withdrawals" element={<Navigate to="/trading" replace />} />
                <Route path="/bank" element={<Navigate to="/trading" replace />} />
                <Route path="/gifts" element={<Gifts />} />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </ToastProvider>
          </CartProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
