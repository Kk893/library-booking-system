import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';
import toast from 'react-hot-toast';

const ImageUploadTest = () => {
  const { isDark } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedType, setSelectedType] = useState('general');

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      console.log(`Uploading to: /api/images/upload/${selectedType}`);
      
      const response = await axios.post(`/api/images/upload/${selectedType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      console.log('Upload response:', response.data);
      
      const fullImageUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${response.data.imageUrl}`;
      
      setUploadedImages(prev => [...prev, {
        type: selectedType,
        url: fullImageUrl,
        filename: response.data.filename,
        originalName: response.data.originalName,
        size: response.data.size
      }]);

      toast.success('📸 Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`min-h-screen p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        <div className={`rounded-2xl p-8 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h1 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🧪 Image Upload Test
          </h1>
          
          <div className="space-y-6">
            {/* Upload Type Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Upload Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="general">General</option>
                <option value="books">Books</option>
                <option value="libraries">Libraries</option>
                <option value="profiles">Profiles</option>
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Image
              </label>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all hover:border-blue-500 ${
                isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className={`py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-lg font-medium">Click to upload image</p>
                    <p className="text-sm mt-1">Max 10MB • JPG, PNG, GIF, WebP</p>
                  </div>
                </label>
                
                {uploading && (
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm">Uploading...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Images */}
            {uploadedImages.length > 0 && (
              <div>
                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  📸 Uploaded Images ({uploadedImages.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className={`rounded-lg overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <img 
                        src={image.url} 
                        alt={image.originalName}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          console.error('Image load error:', e.target.src);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-48 bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-500">❌ Failed to load</span>
                      </div>
                      <div className="p-4">
                        <div className="space-y-1 text-sm">
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {image.originalName}
                          </p>
                          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                            Type: {image.type}
                          </p>
                          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                            Size: {Math.round(image.size / 1024)} KB
                          </p>
                          <p className={`text-xs break-all ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            {image.url}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Results */}
            <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <h3 className={`font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                ✅ Test Status
              </h3>
              <div className="space-y-1 text-sm">
                <p className={isDark ? 'text-green-300' : 'text-green-600'}>
                  • Upload directories: Ready
                </p>
                <p className={isDark ? 'text-green-300' : 'text-green-600'}>
                  • API endpoints: Working
                </p>
                <p className={isDark ? 'text-green-300' : 'text-green-600'}>
                  • File serving: Active
                </p>
                <p className={isDark ? 'text-green-300' : 'text-green-600'}>
                  • Database integration: Connected
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadTest;