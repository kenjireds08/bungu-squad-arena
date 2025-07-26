import { useState, useEffect } from 'react';
import { MainDashboard } from '@/components/MainDashboard';
import { Login } from '@/components/Login';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <MainDashboard currentUserId={currentUserId} isAdmin={isAdmin} />;
};

export default Index;
