import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Games from './pages/Games.jsx';
import Investments from './pages/Investments.jsx';
import Gifts from './pages/Gifts.jsx';
import Tasks from './pages/Tasks.jsx';
import Withdrawals from './pages/Withdrawals.jsx';
import BankInfo from './pages/BankInfo.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="games" element={<Games />} />
        <Route path="investments" element={<Investments />} />
        <Route path="gifts" element={<Gifts />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="withdrawals" element={<Withdrawals />} />
        <Route path="bank" element={<BankInfo />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
