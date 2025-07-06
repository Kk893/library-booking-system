import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Offers = () => {
  const { isDark } = useTheme();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await axios.get('/api/offers');
      setOffers(response.data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyPromoCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Promo code ${code} copied!`);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const calculateSavings = (discount, baseAmount = 500) => {
    return Math.round((baseAmount * discount) / 100);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              🎁 Special Offers & Deals
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Save big on your library bookings with our exclusive offers
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Featured Offer Banner */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl p-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">🌟 Limited Time Offer!</h2>
            <p className="text-xl mb-4">Get up to 30% OFF on your first booking</p>
            <div className="bg-white/20 backdrop-blur-lg rounded-lg p-4 inline-block">
              <p className="text-sm mb-2">Use Promo Code:</p>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl font-bold">WELCOME30</span>
                <button
                  onClick={() => copyPromoCode('WELCOME30')}
                  className="bg-white text-purple-600 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all"
                >
                  {copiedCode === 'WELCOME30' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div
              key={offer._id}
              className={`rounded-2xl shadow-lg overflow-hidden transition-all transform hover:scale-105 ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}
            >
              {/* Offer Header */}
              <div className={`p-6 ${
                offer.discount >= 25 ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                offer.discount >= 20 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                offer.discount >= 15 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                'bg-gradient-to-r from-blue-500 to-purple-600'
              } text-white text-center`}>
                <div className="text-4xl font-bold mb-2">{offer.discount}%</div>
                <div className="text-lg font-semibold">OFF</div>
              </div>

              {/* Offer Details */}
              <div className="p-6">
                <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {offer.title}
                </h3>
                
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {offer.description}
                </p>

                {/* Promo Code */}
                <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Promo Code</p>
                      <p className={`font-mono font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {offer.code}
                      </p>
                    </div>
                    <button
                      onClick={() => copyPromoCode(offer.code)}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                        copiedCode === offer.code
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {copiedCode === offer.code ? '✓ Copied' : 'Copy Code'}
                    </button>
                  </div>
                </div>

                {/* Savings Info */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>You Save</p>
                    <p className="text-lg font-bold text-green-500">
                      ₹{calculateSavings(offer.discount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Valid Until</p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {new Date(offer.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Usage Stats */}
                {offer.usageLimit && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                        Used: {offer.usedCount || 0}/{offer.usageLimit}
                      </span>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                        {Math.round(((offer.usedCount || 0) / offer.usageLimit) * 100)}%
                      </span>
                    </div>
                    <div className={`w-full bg-gray-200 rounded-full h-2 ${isDark ? 'bg-gray-600' : ''}`}>
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(((offer.usedCount || 0) / offer.usageLimit) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => copyPromoCode(offer.code)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  Use This Offer
                </button>
              </div>
            </div>
          ))}
        </div>

        {offers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎁</div>
            <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              No active offers available
            </p>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Check back later for exciting deals and discounts
            </p>
          </div>
        )}

        {/* How to Use Section */}
        <div className={`mt-12 p-8 rounded-2xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-2xl font-bold mb-6 text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🤔 How to Use Offers
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">1️⃣</span>
              </div>
              <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Copy Code</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Click on any offer to copy the promo code
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">2️⃣</span>
              </div>
              <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Book Seats</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Select library, seats, and proceed to booking
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">3️⃣</span>
              </div>
              <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Apply & Save</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Enter code during booking to get discount
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Offers;