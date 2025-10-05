// Performance optimization utilities

// Debounce function to limit API calls
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Cache for API responses
const cache = new Map();

// Cache API responses for a specified duration
export const cacheResponse = (key, data, duration = 300000) => { // 5 minutes default
  cache.set(key, {
    data,
    timestamp: Date.now(),
    duration
  });
};

// Get cached response if still valid
export const getCachedResponse = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.duration) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

// Clear expired cache entries
export const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.duration) {
      cache.delete(key);
    }
  }
};

// Throttle function for scroll events
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};