import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import ProfileImageUpload from '../components/ProfileImageUpload';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://10.50.155.49:5000';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    profileImage: user?.profileImage || null,
    preferences: {
      notifications: user?.preferences?.notifications || true,
      emailUpdates: user?.preferences?.emailUpdates || false,
      darkMode: isDark
    }
  });

  // Update profileData when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        profileImage: user.profileImage || null,
        preferences: {
          notifications: user.preferences?.notifications || true,
          emailUpdates: user.preferences?.emailUpdates || false,
          darkMode: isDark
        }
      });
    }
  }, [user, isDark]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/user/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure profile image is preserved
      const updatedUser = { ...response.data, profileImage: profileData.profileImage || response.data.profileImage };
      updateUser(updatedUser);
      setProfileData(prev => ({ ...prev, ...updatedUser }));
      
      toast.success('✅ Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('🔒 Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpdate = async (imageUrl, file) => {
    // Update preview immediately
    setProfileData({ ...profileData, profileImage: imageUrl });
    
    if (file) {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/user/profile/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });
        
        const serverImageUrl = `${API_BASE_URL}${response.data.profileImage}`;
        const updatedUser = { ...user, profileImage: serverImageUrl };
        
        // Update both local state and global user state
        setProfileData({ ...profileData, profileImage: serverImageUrl });
        updateUser(updatedUser);
        
        toast.success('📸 Profile picture updated!');
      } catch (error) {
        console.error('Image upload error:', error);
        toast.error('Failed to upload image');
        // Revert to original image on error
        setProfileData({ ...profileData, profileImage: user?.profileImage });
      }
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto mobile-container py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            My Profile
          </h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              isEditing 
                ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isEditing ? '❌ Cancel' : '✏️ Edit Profile'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Profile Card */}
          <div className={`backdrop-blur-lg rounded-2xl p-6 h-fit ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <div className="text-center">
              <ProfileImageUpload
                currentImage={profileData.profileImage}
                onImageUpdate={handleImageUpdate}
                userName={profileData.name}
              />
              <h2 className={`text-xl font-bold mt-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {profileData.name}
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {profileData.email}
              </p>
              <div className={`mt-4 px-3 py-1 rounded-full text-xs font-semibold ${
                user?.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                user?.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                'bg-green-100 text-green-800'
              }`}>
                {user?.role === 'admin' ? '🔑 Admin' :
                 user?.role === 'superadmin' ? '👑 Super Admin' :
                 '👤 User'}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Member Since</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Bookings</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {user?.totalBookings || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Status</span>
                <span className="font-semibold text-green-500">✅ Active</span>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                👤 Personal Information
              </h3>
              
              <form onSubmit={handleProfileUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 rounded-lg border transition-all ${
                        isEditing 
                          ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          : isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                      }`}
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      Email cannot be changed
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 rounded-lg border transition-all ${
                        isEditing 
                          ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          : isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      City
                    </label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 rounded-lg border transition-all ${
                        isEditing 
                          ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          : isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Address
                  </label>
                  <textarea
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    disabled={!isEditing}
                    rows="3"
                    className={`w-full px-4 py-2 rounded-lg border transition-all ${
                      isEditing 
                        ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        : isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  />
                </div>

                {isEditing && (
                  <div className="flex space-x-4 mt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {loading ? '⏳ Saving...' : '💾 Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Preferences */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                ⚙️ Preferences
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      Push Notifications
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Receive booking confirmations and updates
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileData.preferences.notifications}
                      onChange={(e) => setProfileData({
                        ...profileData, 
                        preferences: {...profileData.preferences, notifications: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      Email Updates
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Receive promotional emails and newsletters
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileData.preferences.emailUpdates}
                      onChange={(e) => setProfileData({
                        ...profileData, 
                        preferences: {...profileData.preferences, emailUpdates: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  🔒 Security
                </h3>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                >
                  {showPasswordForm ? '❌ Cancel' : '🔑 Change Password'}
                </button>
              </div>

              {showPasswordForm && (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                        required
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? '⏳ Updating...' : '🔒 Update Password'}
                  </button>
                </form>
              )}

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">🛡️ Security Tips</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Use a strong password with at least 8 characters</li>
                  <li>• Include uppercase, lowercase, numbers, and symbols</li>
                  <li>• Don't share your password with anyone</li>
                  <li>• Change your password regularly</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;