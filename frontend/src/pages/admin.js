import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiUsers, FiBookOpen, FiMap, FiCalendar, FiSettings, 
  FiDollarSign, FiTag, FiChevronDown, FiChevronUp, FiEdit, 
  FiTrash2, FiPlus, FiSearch, FiFilter 
} from 'react-icons/fi';

const AdminDashboard = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // ✅ All useState hooks inside component
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLibraryFilter, setShowLibraryFilter] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [libraries, setLibraries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalLibraries: 0,
    totalBookings: 0,
    totalRevenue: 0,
    recentBookings: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editLibraryId, setEditLibraryId] = useState(null);
  const [showEditLibraryModal, setShowEditLibraryModal] = useState(false);

  // ✅ Fetch access check
  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
      router.push('/login?redirect=admin');
    }
  }, [isAuthenticated, user, router]);

  // ✅ Fetch admin data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin')) return;

      setIsLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, librariesRes, bookingsRes] = await Promise.all([
          axios.get('/api/admin/stats', { headers }),
          axios.get('/api/admin/libraries', { headers }),
          axios.get('/api/admin/bookings', { headers })
        ]);

        setStats(statsRes.data);
        setLibraries(librariesRes.data);
        setBookings(bookingsRes.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, user]);

  // 🧠 Helpers
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      searchTerm === '' ||
      booking.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.library?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLibrary =
      selectedLibrary === '' || booking.library?.name === selectedLibrary;

    return matchesSearch && matchesLibrary;
  });

  const handleViewLibrary = (libraryId) => {
    router.push(`/admin/libraries/${libraryId}`);
  };

  const handleEditLibrary = (libraryId) => {
    setEditLibraryId(libraryId);
    setShowEditLibraryModal(true);
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard | LibraryBooking</title>
        <meta name="description" content="Admin dashboard for library booking system" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* Sidebar & Tabs here */}
          {/* Dashboard header and layout here */}
          {/* Dashboard Cards, Tables, Filters, etc. */}
          {/* You can paste your full dashboard JSX body (from your previous message) inside here */}

          {/* TIP: Place this comment where your tab logic/rendering starts: */}
          {/* {activeTab === 'dashboard' && ( ... )} */}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
