import React from 'react';
import { useTheme } from '../context/ThemeContext';

const OfferBanner = () => {
  const { isDark } = useTheme();

  const offers = [
    { title: '₹100 OFF', subtitle: 'On first booking', bg: 'from-red-500 to-pink-500' },
    { title: 'FREE WIFI', subtitle: 'All libraries', bg: 'from-blue-500 to-cyan-500' },
    { title: '50% OFF', subtitle: 'Premium seats', bg: 'from-purple-500 to-indigo-500' }
  ];

  return (
    <div className="md:hidden px-4 py-3">
      <div className="flex space-x-3 overflow-x-auto horizontal-scroll">
        {offers.map((offer, index) => (
          <div
            key={index}
            className={`flex-shrink-0 w-48 h-20 bg-gradient-to-r ${offer.bg} rounded-lg p-3 text-white`}
          >
            <div className="text-lg font-bold">{offer.title}</div>
            <div className="text-sm opacity-90">{offer.subtitle}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OfferBanner;