import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';
import toast from 'react-hot-toast';
import { getImageUrl, handleImageError, validateImageFile, createImagePreview } from '../utils/imageUtils';

const MultipleImageUpload = ({ onImagesUpload, currentImages = [], type = 'libraries', placeholder = 'Upload Images' }) => {
  const { isDark } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(currentImages);

  const handleImageSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Validate all files
    for (const file of files) {
      const validation = validateImageFile(file, 10);
      if (!validation.isValid) {
        toast.error(`${file.name}: ${validation.error}`);
        return;
      }
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        // Create preview
        const previewUrl = await createImagePreview(file);
        
        // Upload to server
        const formData = new FormData();
        formData.append('image', file);

        const response = await axios.post(`/api/images/upload/${type}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        });

        return {
          preview: previewUrl,
          url: response.data.imageUrl,
          fullUrl: getImageUrl(response.data.imageUrl)
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      const newImages = [...images, ...uploadedImages.map(img => img.url)];
      
      setImages(newImages);
      
      if (onImagesUpload) {
        onImagesUpload(newImages);
      }

      toast.success(`📸 ${files.length} image(s) uploaded successfully!`);
    } catch (error) {
      console.error('Multiple image upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (onImagesUpload) {
      onImagesUpload(newImages);
    }
    toast.success('Image removed');
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all hover:border-blue-500 ${
        isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
      }`}>
        <label className="cursor-pointer block">
          <div className={`py-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm font-medium">{placeholder}</p>
            <p className="text-xs mt-1">Select multiple images (Max 10MB each)</p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">Uploading images...</p>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={getImageUrl(image)}
                alt={`Upload ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
                onError={handleImageError}
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultipleImageUpload;