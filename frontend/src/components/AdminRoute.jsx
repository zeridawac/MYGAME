import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <Navigate to="/trading" replace />;
  }

  return children;
};

export default AdminRoute;
