import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AdminRoute from './components/AdminRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import BankInfo from './pages/BankInfo.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Games from './pages/Games.jsx';
import Gifts from './pages/Gifts.jsx';
import Investments from './pages/Investments.jsx';
import Login from './pages/Login.jsx';
import ProjectSuspended from './pages/ProjectSuspended.jsx';
import Register from './pages/Register.jsx';
import Tasks from './pages/Tasks.jsx';
import Withdrawals from './pages/Withdrawals.jsx';

const PortalEntry = () => {
  const navigate = useNavigate();

  return <ProjectSuspended onEnterSite={() => navigate('/login')} />;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
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
              <Route path="/games" element={<Games />} />
              <Route path="/trading" element={<Investments />} />
              <Route path="/investments" element={<Navigate to="/trading" replace />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/bank" element={<BankInfo />} />
              <Route path="/gifts" element={<Gifts />} />
              <Route path="/tasks" element={<Tasks />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
