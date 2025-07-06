import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const SeatSelection = ({ library, selectedSeats, onSeatSelect, onSeatDeselect }) => {
  const { isDark } = useTheme();
  const [hoveredSeat, setHoveredSeat] = useState(null);

  const generateSeatLayout = () => {
    const layout = library?.seatLayout || { 
      regular: { count: 20, price: 100 }, 
      ac: { count: 15, price: 150 }, 
      premium: { count: 10, price: 200 } 
    };

    const sections = [
      {
        name: 'Regular Seats',
        type: 'regular',
        price: layout.regular.price,
        color: 'blue',
        rows: Math.ceil(layout.regular.count / 10),
        seatsPerRow: 10,
        prefix: 'A'
      },
      {
        name: 'AC Seats', 
        type: 'ac',
        price: layout.ac.price,
        color: 'purple',
        rows: Math.ceil(layout.ac.count / 10),
        seatsPerRow: 10,
        prefix: 'B'
      },
      {
        name: 'Premium Seats',
        type: 'premium', 
        price: layout.premium.price,
        color: 'yellow',
        rows: Math.ceil(layout.premium.count / 10),
        seatsPerRow: 10,
        prefix: 'C'
      }
    ];

    return sections;
  };

  const getSeatStatus = (seatId) => {
    if (selectedSeats.includes(seatId)) return 'selected';
    // Mock some occupied seats
    const occupiedSeats = ['A-01', 'A-05', 'B-03', 'B-07', 'C-02'];
    if (occupiedSeats.includes(seatId)) return 'occupied';
    return 'available';
  };

  const handleSeatClick = (seatId, price) => {
    const status = getSeatStatus(seatId);
    if (status === 'occupied') return;
    
    if (status === 'selected') {
      onSeatDeselect(seatId);
    } else {
      onSeatSelect(seatId, price);
    }
  };

  const getSeatColor = (seatId, sectionColor) => {
    const status = getSeatStatus(seatId);
    
    if (status === 'occupied') {
      return 'bg-red-500 cursor-not-allowed';
    }
    
    if (status === 'selected') {
      return 'bg-green-500 transform scale-110 shadow-lg';
    }
    
    if (hoveredSeat === seatId) {
      return `bg-${sectionColor}-400 transform scale-105`;
    }
    
    return `bg-${sectionColor}-200 hover:bg-${sectionColor}-300`;
  };

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Screen */}
      <div className="mb-8">
        <div className={`h-2 rounded-full bg-gradient-to-r from-gray-300 to-gray-500 mb-2`}></div>
        <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          📺 SCREEN THIS WAY
        </p>
      </div>

      {/* Seat Layout */}
      <div className="space-y-8">
        {generateSeatLayout().map((section) => (
          <div key={section.type} className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {section.name} - ₹{section.price}
              </h3>
              <div className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded bg-${section.color}-200`}></div>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Available
                </span>
              </div>
            </div>

            {/* Seats Grid */}
            <div className="space-y-2">
              {Array.from({ length: section.rows }, (_, rowIndex) => (
                <div key={rowIndex} className="flex items-center justify-center space-x-2">
                  {/* Row Label */}
                  <div className={`w-8 text-center font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {section.prefix}{rowIndex + 1}
                  </div>

                  {/* Seats in Row */}
                  <div className="flex space-x-1">
                    {Array.from({ length: section.seatsPerRow }, (_, seatIndex) => {
                      const seatNumber = (rowIndex * section.seatsPerRow) + seatIndex + 1;
                      const seatId = `${section.prefix}-${seatNumber.toString().padStart(2, '0')}`;
                      
                      return (
                        <button
                          key={seatId}
                          onClick={() => handleSeatClick(seatId, section.price)}
                          onMouseEnter={() => setHoveredSeat(seatId)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          className={`
                            w-8 h-8 rounded-t-lg border-2 border-gray-300 
                            transition-all duration-200 text-xs font-bold
                            ${getSeatColor(seatId, section.color)}
                            ${getSeatStatus(seatId) === 'occupied' ? 'text-white' : 'text-gray-700'}
                          `}
                          disabled={getSeatStatus(seatId) === 'occupied'}
                          title={`${seatId} - ₹${section.price}`}
                        >
                          {seatNumber}
                        </button>
                      );
                    })}
                  </div>

                  {/* Aisle Gap */}
                  <div className="w-4"></div>

                  {/* More seats if needed */}
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(section.seatsPerRow, 5) }, (_, seatIndex) => {
                      const seatNumber = (rowIndex * section.seatsPerRow) + section.seatsPerRow + seatIndex + 1;
                      const seatId = `${section.prefix}-${seatNumber.toString().padStart(2, '0')}`;
                      
                      if (seatNumber > (section.rows * section.seatsPerRow)) return null;
                      
                      return (
                        <button
                          key={seatId}
                          onClick={() => handleSeatClick(seatId, section.price)}
                          onMouseEnter={() => setHoveredSeat(seatId)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          className={`
                            w-8 h-8 rounded-t-lg border-2 border-gray-300 
                            transition-all duration-200 text-xs font-bold
                            ${getSeatColor(seatId, section.color)}
                            ${getSeatStatus(seatId) === 'occupied' ? 'text-white' : 'text-gray-700'}
                          `}
                          disabled={getSeatStatus(seatId) === 'occupied'}
                          title={`${seatId} - ₹${section.price}`}
                        >
                          {seatNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 flex justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-gray-200"></div>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Occupied</span>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;