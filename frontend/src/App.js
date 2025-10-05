import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNavigation from './components/BottomNavigation';
import MobileTopBar from './components/MobileTopBar';
import './styles/macOS.css';
import Home from './pages/Home';
import Libraries from './pages/Libraries';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerification from './pages/EmailVerification';
import VerifyEmail from './pages/VerifyEmail';
import ResendVerification from './pages/ResendVerification';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminLogin from './pages/SuperAdminLogin';
import UserDashboard from './pages/UserDashboard';
import LibraryDetails from './pages/LibraryDetails';
import MyBookings from './pages/MyBookings';
import Books from './pages/Books';
import Offers from './pages/Offers';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Events from './pages/Events';
import QRScanner from './pages/QRScanner';
import GlobalEvents from './pages/GlobalEvents';
import ImageTest from './components/ImageTest';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ThemeButton from './components/ThemeButton';

const AppContent = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen transition-all duration-300 pb-16 md:pb-0 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ThemeButton />
      <div className="hidden md:block">
        <MobileTopBar />
      </div>
      <Navbar />
      <main className={`${window.location.pathname === '/' ? '' : 'mobile-container py-4 sm:py-8'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/libraries" element={<Libraries />} />
          <Route path="/libraries/:id" element={<LibraryDetails />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/books" element={<Books />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/events" element={<Events />} />
          <Route path="/qr-scanner" element={<QRScanner />} />
          <Route path="/global-events" element={<GlobalEvents />} />
          <Route path="/test-images" element={<ImageTest />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/resend-verification" element={<ResendVerification />} />
          <Route path="/superadmin-login" element={<SuperAdminLogin />} />
          
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
        </Routes>
      </main>
      <BottomNavigation />
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