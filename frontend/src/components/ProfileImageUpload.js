import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { getImageUrl, handleImageError, getInitials, validateImageFile, createImagePreview } from '../utils/imageUtils';

const ProfileImageUpload = ({ currentImage, onImageUpdate, userName }) => {
  const { isDark } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [displayImage, setDisplayImage] = useState(currentImage);
  
  // Update display image when currentImage prop changes
  useEffect(() => {
    setDisplayImage(currentImage);
  }, [currentImage]);

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file, 2);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);
    
    try {
      // Create preview and upload file
      const previewUrl = await createImagePreview(file);
      setDisplayImage(previewUrl);
      onImageUpdate(previewUrl, file);
    } catch (error) {
      console.error('Preview creation error:', error);
      toast.error('Failed to create image preview');
    } finally {
      setUploading(false);
    }
  };



  return (
    <div className="relative inline-block">
      <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
        {displayImage ? (
          <img 
            src={getImageUrl(displayImage)} 
            alt="Profile" 
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : null}
        
        {/* Fallback initials - always present but hidden when image loads */}
        <div 
          className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
          style={{ display: displayImage ? 'none' : 'flex' }}
        >
          <span className="text-white text-2xl font-bold">
            {getInitials(userName)}
          </span>
        </div>
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      
      <label className={`absolute bottom-0 right-0 w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-all hover:scale-110 ${
        isDark ? 'bg-gray-700 border-2 border-gray-600' : 'bg-white border-2 border-gray-300'
      }`}>
        <span className="text-sm">📷</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          disabled={uploading}
        />
      </label>
    </div>
  );
};

export default ProfileImageUpload;