import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const OfferModal = ({ isOpen, onClose, onApplyOffer, totalAmount }) => {
  const { isDark } = useTheme();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchOffers();
    }
  }, [isOpen]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/offers');
      setOffers(response.data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    try {
      const response = await axios.post('/api/offers/validate', { code: promoCode });
      const offer = response.data;
      
      if (offer.isActive && new Date(offer.validUntil) > new Date()) {
        setAppliedOffer(offer);
        onApplyOffer(offer);
        toast.success(`🎉 ${offer.discount}% discount applied!`);
        onClose();
      } else {
        toast.error('Invalid or expired promo code');
      }
    } catch (error) {
      toast.error('Invalid promo code');
    }
  };

  const handleSelectOffer = (offer) => {
    setAppliedOffer(offer);
    onApplyOffer(offer);
    toast.success(`🎉 ${offer.discount}% discount applied!`);
    onClose();
  };

  const calculateDiscount = (discount) => {
    return Math.round((totalAmount * discount) / 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🎁 Available Offers
          </h3>
          <button
            onClick={onClose}
            className={`text-2xl ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
          >
            ✕
          </button>
        </div>

        {/* Promo Code Input */}
        <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Have a Promo Code?
          </h4>
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className={`flex-1 px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
              }`}
            />
            <button
              onClick={handleApplyPromoCode}
              className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Available Offers */}
        <div className="space-y-4">
          <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Available Offers
          </h4>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading offers...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.filter(offer => offer.isActive && new Date(offer.validUntil) > new Date()).map((offer) => (
                <div
                  key={offer._id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                    isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectOffer(offer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {offer.discount}% OFF
                        </div>
                        <h5 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {offer.title}
                        </h5>
                      </div>
                      
                      <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {offer.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                            Code: {offer.code}
                          </span>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Valid till {new Date(offer.validUntil).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            Save ₹{calculateDiscount(offer.discount)}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            on ₹{totalAmount}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {offers.filter(offer => offer.isActive && new Date(offer.validUntil) > new Date()).length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎁</div>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No active offers available
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Booking Summary */}
        <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Booking Summary
          </h4>
          <div className="flex justify-between">
            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Total Amount:</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>₹{totalAmount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;