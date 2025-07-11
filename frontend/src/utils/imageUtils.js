// Utility functions for handling images across the application

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Get the full URL for an image
 * @param {string} imagePath - The image path from database or component
 * @returns {string} - Full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL (http/https), return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it's a base64 data URL, return as is
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // If it's a relative path, prepend the API base URL
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  
  // If it doesn't start with /, add it
  return `${API_BASE_URL}/${imagePath}`;
};

/**
 * Handle image load error by hiding the image and showing fallback
 * @param {Event} e - The error event
 * @param {string} fallbackSelector - CSS selector for fallback element (optional)
 */
export const handleImageError = (e, fallbackSelector = null) => {
  e.target.style.display = 'none';
  
  if (fallbackSelector) {
    const fallback = e.target.parentElement.querySelector(fallbackSelector);
    if (fallback) {
      fallback.style.display = 'flex';
    }
  } else {
    // Default: show next sibling
    if (e.target.nextSibling) {
      e.target.nextSibling.style.display = 'flex';
    }
  }
};

/**
 * Get initials from a name for profile fallback
 * @param {string} name - Full name
 * @returns {string} - Initials (max 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Validate image file before upload
 * @param {File} file - The file to validate
 * @param {number} maxSizeMB - Maximum file size in MB (default: 10)
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateImageFile = (file, maxSizeMB = 10) => {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select a valid image file' };
  }
  
  const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  if (file.size > maxSize) {
    return { isValid: false, error: `Image size should be less than ${maxSizeMB}MB` };
  }
  
  return { isValid: true, error: null };
};

/**
 * Create a preview URL for a file
 * @param {File} file - The file to create preview for
 * @returns {Promise<string>} - Promise that resolves to preview URL
 */
export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default {
  getImageUrl,
  handleImageError,
  getInitials,
  validateImageFile,
  createImagePreview
};