import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';
import toast from 'react-hot-toast';
import { getImageUrl, handleImageError, validateImageFile, createImagePreview } from '../utils/imageUtils';

const ImageUpload = ({ onImageUpload, currentImage, type = 'general', placeholder = 'Upload Image' }) => {
  const { isDark } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file, 10);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);

    try {
      // Create preview immediately
      const previewUrl = await createImagePreview(file);
      setPreview(previewUrl);

      // Upload to server
      const formData = new FormData();
      formData.append('image', file);

      console.log('Uploading to:', `/api/images/upload/${type}`);
      
      const response = await axios.post(`/api/images/upload/${type}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      });

      console.log('Upload response:', response.data);
      
      const fullImageUrl = getImageUrl(response.data.imageUrl);
      
      if (onImageUpload) {
        onImageUpload(fullImageUrl, response.data.imageUrl);
      }

      toast.success('📸 Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || error.message || 'Failed to upload image');
      setPreview(getImageUrl(currentImage)); // Revert preview on error
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all hover:border-blue-500 ${
        isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
      }`}>
        {preview ? (
          <div className="relative">
            <img 
              src={getImageUrl(preview)} 
              alt="Preview" 
              className="w-full h-48 object-cover rounded-lg mb-2"
              onError={handleImageError}
            />
            <div className="absolute top-2 right-2">
              <label className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full cursor-pointer transition-all">
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
          </div>
        ) : (
          <label className="cursor-pointer block">
            <div className={`py-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm font-medium">{placeholder}</p>
              <p className="text-xs mt-1">Click to select image (Max 10MB)</p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">Uploading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;