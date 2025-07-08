import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';
import toast from 'react-hot-toast';

const RatingComponent = ({ libraryId, showAddRating = true }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [userRating, setUserRating] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [newRating, setNewRating] = useState({ rating: 5, review: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (libraryId) {
      fetchRatings();
      if (user && user.role === 'user') {
        fetchUserRating();
      }
    }
  }, [libraryId, user]);

  const fetchRatings = async () => {
    try {
      const response = await axios.get(`/api/ratings/library/${libraryId}`);
      setRatings(response.data.ratings);
      setAverageRating(response.data.averageRating);
      setTotalRatings(response.data.totalRatings);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRating = async () => {
    try {
      const response = await axios.get(`/api/ratings/user/${libraryId}`);
      setUserRating(response.data);
      if (response.data) {
        setNewRating({ rating: response.data.rating, review: response.data.review });
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/ratings/library/${libraryId}`, newRating);
      toast.success(userRating ? '⭐ Rating updated!' : '⭐ Rating added!');
      setShowRatingForm(false);
      fetchRatings();
      fetchUserRating();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    }
  };

  const renderStars = (rating, interactive = false, onStarClick = null) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onStarClick && onStarClick(star)}
            className={`text-xl ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-all ${
              star <= rating ? 'text-yellow-500' : 'text-gray-300'
            }`}
            disabled={!interactive}
          >
            ⭐
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="animate-pulse">Loading ratings...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            ⭐ Ratings & Reviews
          </h3>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-2">
              {renderStars(Math.round(averageRating))}
              <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {averageRating.toFixed(1)}
              </span>
            </div>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              ({totalRatings} reviews)
            </span>
          </div>
        </div>
        
        {user && user.role === 'user' && showAddRating && (
          <button
            onClick={() => setShowRatingForm(!showRatingForm)}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105"
          >
            {userRating ? '✏️ Edit Rating' : '⭐ Add Rating'}
          </button>
        )}
      </div>

      {/* Rating Form */}
      {showRatingForm && user && user.role === 'user' && (
        <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <form onSubmit={handleSubmitRating} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Rating
              </label>
              {renderStars(newRating.rating, true, (rating) => setNewRating({...newRating, rating}))}
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Review (Optional)
              </label>
              <textarea
                value={newRating.review}
                onChange={(e) => setNewRating({...newRating, review: e.target.value})}
                placeholder="Share your experience..."
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                }`}
                rows="3"
                maxLength="500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                {userRating ? 'Update Rating' : 'Submit Rating'}
              </button>
              <button
                type="button"
                onClick={() => setShowRatingForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ratings List */}
      <div className="space-y-4">
        {ratings.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="text-4xl mb-2">⭐</div>
            <p>No reviews yet. Be the first to rate this library!</p>
          </div>
        ) : (
          ratings.map((rating) => (
            <div
              key={rating._id}
              className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {rating.userId?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {rating.userId?.name || 'Anonymous'}
                        </span>
                        {renderStars(rating.rating)}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {rating.review && (
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} ml-11`}>
                      {rating.review}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RatingComponent;