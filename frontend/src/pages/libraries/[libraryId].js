import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FiMapPin, FiClock, FiPhone, FiMail, FiStar, FiBook, FiCalendar, FiWifi, FiCoffee, FiAirplay, FiBookOpen, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';

// Sample library data (would come from API in production)
const libraryData = {
  id: 1,
  name: 'Central City Library',
  description: 'The Central City Library is a modern facility offering a wide range of resources for readers of all ages. With spacious reading areas, private study rooms, and a café, it\'s the perfect place for studying, working, or simply enjoying a good book.',
  address: '123 Main St, Downtown',
  city: 'New York',
  area: 'Downtown',
  image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da',
  gallery: [
    'https://images.unsplash.com/photo-1521587760476-6c12a4b040da',
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66',
    'https://images.unsplash.com/photo-1568667256549-094345857637',
    'https://images.unsplash.com/photo-1535905557558-afc4877a26fc',
  ],
  facilities: [
    { name: 'WiFi', icon: <FiWifi /> },
    { name: 'AC', icon: <FiAirplay /> },
    { name: 'Cafe', icon: <FiCoffee /> },
    { name: 'Study Rooms', icon: <FiBookOpen /> },
    { name: 'Printing Services', icon: <FiBookOpen /> },
    { name: 'Children\'s Area', icon: <FiBookOpen /> },
  ],
  openingHours: [
    { day: 'Monday - Friday', hours: '9:00 AM - 8:00 PM' },
    { day: 'Saturday', hours: '10:00 AM - 6:00 PM' },
    { day: 'Sunday', hours: '12:00 PM - 5:00 PM' },
  ],
  contactInfo: {
    phone: '+1 (555) 123-4567',
    email: 'contact@centralcitylibrary.com',
    website: 'www.centralcitylibrary.com',
  },
  rating: 4.8,
  reviewsCount: 124,
  seatTypes: [
    {
      id: 1,
      name: 'Regular Seat',
      description: 'Standard seating with table space',
      price: 5,
      image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6',
      available: 25,
      total: 30,
    },
    {
      id: 2,
      name: 'AC Cubicle',
      description: 'Private air-conditioned cubicle with power outlets',
      price: 12,
      image: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc',
      available: 8,
      total: 10,
    },
    {
      id: 3,
      name: 'Premium Booth',
      description: 'Spacious booth with comfortable seating for up to 4 people',
      price: 20,
      image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',
      available: 3,
      total: 5,
    },
  ],
  featuredBooks: [
    {
      id: 1,
      title: 'The Library at Mount Char',
      author: 'Scott Hawkins',
      genre: 'Fantasy',
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
      available: true,
    },
    {
      id: 2,
      title: 'Quiet: The Power of Introverts',
      author: 'Susan Cain',
      genre: 'Non-Fiction',
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794',
      available: true,
    },
    {
      id: 3,
      title: 'The Midnight Library',
      author: 'Matt Haig',
      genre: 'Fiction',
      image: 'https://images.unsplash.com/photo-1589998059171-988d887df646',
      available: false,
    },
  ],
  upcomingEvents: [
    {
      id: 1,
      title: 'Author Meet & Greet',
      date: 'July 15, 2025',
      time: '6:00 PM - 8:00 PM',
      description: 'Meet bestselling author Jane Smith and get your book signed.',
      image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2',
    },
    {
      id: 2,
      title: 'Book Club: Fantasy Fiction',
      date: 'July 20, 2025',
      time: '5:30 PM - 7:30 PM',
      description: 'Join our monthly book club discussion on fantasy fiction.',
      image: 'https://images.unsplash.com/photo-1529148482759-b35b25c5f217',
    },
  ],
};

const LibraryDetail = () => {
  const router = useRouter();
  const { libraryId } = router.query;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  
  // Generate date options for the next 7 days
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      value: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

  const handleBookSeats = (seatTypeId) => {
    if (!selectedDate) {
      alert('Please select a date first');
      return;
    }
    
    router.push({
      pathname: `/libraries/${libraryId}/seats`,
      query: { 
        seatType: seatTypeId,
        date: selectedDate
      },
    });
  };

  // If the page is still loading (client-side navigation)
  if (router.isFallback) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>{libraryData.name} | LibraryBooking</title>
        <meta name="description" content={libraryData.description} />
      </Head>

      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Gallery Section */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="relative h-96 md:h-[500px] w-full">
              <Image
                src={libraryData.gallery[activeImageIndex]}
                alt={libraryData.name}
                fill
                style={{ objectFit: 'cover' }}
                sizes="100vw"
              />
              
              {/* Gallery Navigation */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                {libraryData.gallery.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-3 h-3 rounded-full ${
                      activeImageIndex === index ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex overflow-x-auto py-2 px-4 space-x-2 mt-2">
              {libraryData.gallery.map((image, index) => (
                <div
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`relative h-16 w-24 flex-shrink-0 cursor-pointer rounded-md overflow-hidden ${
                    activeImageIndex === index ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="96px"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Library Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8">
            <div>
              <div className="flex items-center mb-2">
                <h1 className="text-3xl font-bold text-gray-900 mr-4">{libraryData.name}</h1>
                <div className="flex items-center bg-primary-50 text-primary-700 px-2 py-1 rounded-full text-sm">
                  <FiStar className="mr-1" />
                  <span className="font-medium">{libraryData.rating}</span>
                  <span className="text-xs ml-1">({libraryData.reviewsCount} reviews)</span>
                </div>
              </div>
              
              <p className="flex items-center text-gray-600 mb-2">
                <FiMapPin className="mr-2" />
                {libraryData.address}, {libraryData.city}
              </p>
              
              <p className="mb-4 text-gray-700">{libraryData.description}</p>
            </div>

            <div className="mt-4 md:mt-0">
              <Link href={`/libraries/${libraryId}/seats`} className="btn btn-primary">
                Book Seats Now
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Facilities Section */}
              <section className="bg-white rounded-lg shadow-card p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Facilities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {libraryData.facilities.map((facility) => (
                    <div key={facility.name} className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        {facility.icon}
                      </div>
                      <span>{facility.name}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Available Seat Types */}
              <section className="bg-white rounded-lg shadow-card p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Available Seat Types</h2>
                  <div>
                    <label htmlFor="booking-date" className="text-sm font-medium text-gray-700 mr-2">
                      Date:
                    </label>
                    <select
                      id="booking-date"
                      className="form-input py-1 text-sm"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    >
                      <option value="">Select a date</option>
                      {dateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  {libraryData.seatTypes.map((seatType) => (
                    <div key={seatType.id} className="flex flex-col md:flex-row border rounded-lg overflow-hidden">
                      <div className="relative h-48 md:h-auto md:w-1/3">
                        <Image
                          src={seatType.image}
                          alt={seatType.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                      <div className="p-5 md:w-2/3 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold">{seatType.name}</h3>
                            <p className="font-bold text-lg">${seatType.price}<span className="text-sm font-normal text-gray-500">/day</span></p>
                          </div>
                          
                          <p className="text-gray-600 mb-3">{seatType.description}</p>
                          
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {seatType.available} of {seatType.total} available
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleBookSeats(seatType.id)}
                          disabled={!selectedDate}
                          className={`btn btn-primary w-full md:w-auto ${
                            !selectedDate ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Select & Continue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Featured Books */}
              <section className="bg-white rounded-lg shadow-card p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Featured Books</h2>
                  <Link 
                    href={`/libraries/${libraryId}/books`}
                    className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
                  >
                    View All <FiArrowRight className="ml-1" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {libraryData.featuredBooks.map((book) => (
                    <motion.div
                      key={book.id}
                      whileHover={{ scale: 1.03 }}
                      className="book-card"
                    >
                      <div className="relative h-40 w-full">
                        <Image
                          src={book.image}
                          alt={book.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="rounded-t-lg"
                        />
                        <div className="absolute top-2 right-2 z-10">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            book.available 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {book.available ? 'Available' : 'Borrowed'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold mb-1 truncate">{book.title}</h3>
                        <p className="text-gray-600 text-xs mb-1">{book.author}</p>
                        <p className="text-gray-500 text-xs mb-2">{book.genre}</p>
                        <Link 
                          href={`/books/${book.id}`}
                          className="text-primary-600 hover:text-primary-700 inline-flex items-center text-xs"
                        >
                          Details <FiArrowRight className="ml-1" />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Upcoming Events */}
              <section className="bg-white rounded-lg shadow-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Upcoming Events</h2>
                  <Link 
                    href={`/libraries/${libraryId}/events`}
                    className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
                  >
                    View All <FiArrowRight className="ml-1" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {libraryData.upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg overflow-hidden flex flex-col sm:flex-row">
                      <div className="relative h-32 sm:w-1/4">
                        <Image
                          src={event.image}
                          alt={event.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 640px) 100vw, 25vw"
                        />
                      </div>
                      <div className="p-4 sm:w-3/4 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{event.title}</h3>
                          <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                          <div className="flex items-center text-sm text-gray-500 mb-2">
                            <FiCalendar className="mr-1" />
                            <span>{event.date} • {event.time}</span>
                          </div>
                        </div>
                        <Link 
                          href={`/events/${event.id}`}
                          className="btn btn-outline text-sm py-1 px-3 self-start"
                        >
                          Register
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div>
              {/* Opening Hours */}
              <section className="bg-white rounded-lg shadow-card p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Opening Hours</h2>
                <div className="space-y-3">
                  {libraryData.openingHours.map((item) => (
                    <div key={item.day} className="flex justify-between">
                      <div className="flex items-center">
                        <FiClock className="text-gray-400 mr-2" />
                        <span>{item.day}</span>
                      </div>
                      <span className="font-medium">{item.hours}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Contact Information */}
              <section className="bg-white rounded-lg shadow-card p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <FiPhone className="text-gray-400 mr-2" />
                    <span>{libraryData.contactInfo.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <FiMail className="text-gray-400 mr-2" />
                    <span>{libraryData.contactInfo.email}</span>
                  </div>
                  <div className="flex items-center">
                    <FiMapPin className="text-gray-400 mr-2" />
                    <span>{libraryData.address}, {libraryData.city}</span>
                  </div>
                </div>
              </section>

              {/* Map (Placeholder) */}
              <div className="bg-white rounded-lg shadow-card p-4 mb-8">
                <div className="bg-gray-200 h-56 rounded flex items-center justify-center">
                  <p className="text-gray-500">Map View</p>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-primary-50 rounded-lg p-6 border border-primary-100">
                <h3 className="text-lg font-semibold text-primary-800 mb-2">Ready to book your seat?</h3>
                <p className="text-primary-700 mb-4">Select your preferred seat type and date to get started.</p>
                <Link 
                  href={`/libraries/${libraryId}/seats`}
                  className="btn btn-primary w-full"
                >
                  Book Seats Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LibraryDetail;