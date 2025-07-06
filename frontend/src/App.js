import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import './styles/macOS.css';
import Home from './pages/Home';
import Libraries from './pages/Libraries';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminLogin from './pages/SuperAdminLogin';
import Profile from './pages/Profile';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ThemeButton from './components/ThemeButton';

const AppContent = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ThemeButton />
      <Navbar />
      <main className={`${window.location.pathname === '/' ? '' : 'container mx-auto px-6 py-8'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/libraries" element={<Libraries />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/superadmin-login" element={<SuperAdminLogin />} />
          
          {user && (
            <>
              <Route path="/profile" element={<Profile />} />
              {user.role === 'admin' && (
                <Route path="/admin" element={<AdminDashboard />} />
              )}
              {user.role === 'superadmin' && (
                <Route path="/superadmin" element={<SuperAdminDashboard />} />
              )}
            </>
          )}
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;