import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const QRScanner = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [scannedData, setScannedData] = useState(null);
  const [manualEntry, setManualEntry] = useState('');
  const [entryLogs, setEntryLogs] = useState([
    {
      id: '1',
      userName: 'John Doe',
      bookingId: 'BK001',
      seatNumber: 'A-15',
      entryTime: new Date(),
      status: 'success'
    },
    {
      id: '2',
      userName: 'Jane Smith',
      bookingId: 'BK002',
      seatNumber: 'B-08',
      entryTime: new Date(Date.now() - 3600000),
      status: 'success'
    }
  ]);

  // Check admin access
  if (!user || user.role !== 'admin') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Access Denied
          </p>
          <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Only admins can access the QR scanner
          </p>
          <button
            onClick={() => navigate('/admin')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleQRScan = (qrData) => {
    try {
      const bookingData = JSON.parse(qrData);
      
      // Validate QR data
      if (!bookingData.bookingId || !bookingData.userId) {
        toast.error('Invalid QR code');
        return;
      }

      // Check if booking is valid
      if (bookingData.status !== 'confirmed') {
        toast.error('Booking is not confirmed');
        return;
      }

      // Log entry
      const newEntry = {
        id: Date.now().toString(),
        userName: bookingData.userName || 'Unknown User',
        bookingId: bookingData.bookingId,
        seatNumber: bookingData.seatNumber || 'N/A',
        entryTime: new Date(),
        status: 'success'
      };

      setEntryLogs([newEntry, ...entryLogs]);
      setScannedData(bookingData);
      toast.success('✅ Entry approved! Welcome to the library.');

    } catch (error) {
      toast.error('Invalid QR code format');
    }
  };

  const handleManualEntry = () => {
    if (!manualEntry.trim()) {
      toast.error('Please enter booking ID');
      return;
    }

    // Mock manual entry validation
    const newEntry = {
      id: Date.now().toString(),
      userName: 'Manual Entry User',
      bookingId: manualEntry,
      seatNumber: 'Manual',
      entryTime: new Date(),
      status: 'manual'
    };

    setEntryLogs([newEntry, ...entryLogs]);
    setManualEntry('');
    toast.success('✅ Manual entry recorded');
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                📷 QR Entry Scanner
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Scan QR codes for library entry validation
              </p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-semibold transition-all"
            >
              ← Back to Admin
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* QR Scanner Section */}
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📱 QR Code Scanner
            </h2>
            
            {/* Mock QR Scanner Interface */}
            <div className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 ${
              isDark ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="text-6xl mb-4">📷</div>
              <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                QR Scanner Area
              </p>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Position QR code within the frame
              </p>
              
              {/* Mock QR Test Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => handleQRScan(JSON.stringify({
                    bookingId: 'BK' + Date.now(),
                    userId: 'user123',
                    userName: 'Test User',
                    seatNumber: 'A-10',
                    status: 'confirmed',
                    date: new Date().toISOString()
                  }))}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition-all"
                >
                  ✅ Test Valid QR
                </button>
                <button
                  onClick={() => handleQRScan('invalid-qr-data')}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition-all"
                >
                  ❌ Test Invalid QR
                </button>
              </div>
            </div>

            {/* Manual Entry */}
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                📝 Manual Entry (Fallback)
              </h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter Booking ID"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded border ${
                    isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <button
                  onClick={handleManualEntry}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold transition-all"
                >
                  Enter
                </button>
              </div>
            </div>

            {/* Last Scanned Data */}
            {scannedData && (
              <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
                <h3 className={`font-semibold mb-2 ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                  ✅ Last Successful Entry
                </h3>
                <div className={`text-sm space-y-1 ${isDark ? 'text-green-200' : 'text-green-700'}`}>
                  <p><strong>Booking ID:</strong> {scannedData.bookingId}</p>
                  <p><strong>User:</strong> {scannedData.userName}</p>
                  <p><strong>Seat:</strong> {scannedData.seatNumber}</p>
                  <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Entry Logs Section */}
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📋 Entry Logs
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {entryLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg border ${
                    isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {entry.status === 'success' ? '✅' : 
                         entry.status === 'manual' ? '📝' : '❌'}
                      </span>
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {entry.userName}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      entry.status === 'success' ? 'bg-green-100 text-green-800' :
                      entry.status === 'manual' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                  
                  <div className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <p><strong>Booking:</strong> {entry.bookingId}</p>
                    <p><strong>Seat:</strong> {entry.seatNumber}</p>
                    <p><strong>Entry Time:</strong> {entry.entryTime.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {entryLogs.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📋</div>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  No entry logs yet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          {[
            { title: 'Today\'s Entries', value: entryLogs.filter(e => 
              new Date(e.entryTime).toDateString() === new Date().toDateString()
            ).length, icon: '📊', color: 'from-blue-500 to-cyan-500' },
            { title: 'Successful Scans', value: entryLogs.filter(e => e.status === 'success').length, icon: '✅', color: 'from-green-500 to-teal-500' },
            { title: 'Manual Entries', value: entryLogs.filter(e => e.status === 'manual').length, icon: '📝', color: 'from-purple-500 to-pink-500' },
            { title: 'Total Entries', value: entryLogs.length, icon: '📈', color: 'from-yellow-500 to-orange-500' }
          ].map((stat, index) => (
            <div
              key={index}
              className={`backdrop-blur-lg rounded-2xl p-6 ${
                isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-full flex items-center justify-center`}>
                  <span className="text-xl text-white">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;