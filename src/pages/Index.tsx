import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainDashboard } from '@/components/MainDashboard';
import { Login } from '@/components/Login';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUserId = localStorage.getItem('userId');
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (savedUserId) {
      setIsAuthenticated(true);
      setCurrentUserId(savedUserId);
      setIsAdmin(savedIsAdmin);
    }
  }, []);

  const handleLoginSuccess = (userId: string, admin: boolean) => {
    setIsAuthenticated(true);
    setCurrentUserId(userId);
    setIsAdmin(admin);
    
    // Save to localStorage
    localStorage.setItem('userId', userId);
    localStorage.setItem('isAdmin', admin.toString());
    
    // Handle return URL after login
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
      navigate(returnTo);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUserId(null);
    setIsAdmin(false);
    
    // Clear localStorage
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <MainDashboard currentUserId={currentUserId} isAdmin={isAdmin} onLogout={handleLogout} />;
};

export default Index;
