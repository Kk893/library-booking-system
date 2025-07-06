import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const ImageUpload = ({ onImageSelect, currentImage, placeholder = "Upload Image" }) => {
  const { isDark } = useTheme();
  const [preview, setPreview] = useState(currentImage || null);
  const [uploading, setUploading] = useState(false);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setUploading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setPreview(imageUrl);
        onImageSelect(imageUrl, file);
        setUploading(false);
        toast.success('📸 Image uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onImageSelect(null, null);
    toast.success('🗑️ Image removed');
  };

  return (
    <div className="space-y-4">
      <div className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${
        isDark ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50'
      }`}>
        {preview ? (
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="py-8">
            <div className="text-4xl mb-4">📸</div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {placeholder}
            </p>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              PNG, JPG, GIF up to 5MB
            </p>
          </div>
        )}
        
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white">
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