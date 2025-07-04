import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FiSearch, FiMapPin, FiBook, FiCalendar, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import styles from '../styles/components.module.css';

// Sample data (would come from API in production)
const featuredLibraries = [
  {
    id: 1,
    name: 'Central City Library',
    address: '123 Main St, Downtown',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da',
    facilities: ['WiFi', 'AC', 'Cafe'],
    openingHours: '9:00 AM - 8:00 PM',
  },
  {
    id: 2,
    name: 'Riverside Reading Hub',
    address: '456 River Rd, Westside',
    image: 'https://images.unsplash.com/photo-1568667256549-094345857637',
    facilities: ['WiFi', 'Study Rooms', 'Printing'],
    openingHours: '8:00 AM - 6:00 PM',
  },
  {
    id: 3,
    name: 'Northside Knowledge Center',
    address: '789 North Ave, Northside',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66',
    facilities: ['WiFi', 'AC', 'Conference Rooms'],
    openingHours: '10:00 AM - 7:00 PM',
  },
];

const popularBooks = [
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
  {
    id: 4,
    title: 'Atomic Habits',
    author: 'James Clear',
    genre: 'Self-Help',
    image: 'https://images.unsplash.com/photo-1576872381149-7847515ce5d8',
    available: true,
  },
];

const upcomingEvents = [
  {
    id: 1,
    title: 'Author Meet & Greet',
    date: 'July 15, 2025',
    time: '6:00 PM - 8:00 PM',
    location: 'Central City Library',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2',
  },
  {
    id: 2,
    title: 'Book Club: Fantasy Fiction',
    date: 'July 20, 2025',
    time: '5:30 PM - 7:30 PM',
    location: 'Riverside Reading Hub',
    image: 'https://images.unsplash.com/photo-1529148482759-b35b25c5f217',
  },
  {
    id: 3,
    title: "Children's Story Hour",
    date: 'July 22, 2025',
    time: '10:00 AM - 11:00 AM',
    location: 'Northside Knowledge Center',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',
  },
];

export default function Home() {
  const [city, setCity] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    // In production, this would redirect to search results
    console.log('Searching for libraries in:', city);
  };

  return (
    <>
      <Head>
        <title>LibraryBooking - Find and Book Library Seats & Books</title>
        <meta name="description" content="Book library seats and borrow books from libraries near you" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <section className="relative bg-primary-700 text-white">
        <div className="absolute inset-0 z-0 opacity-20">
            <div className="relative h-full w-full">
              <Image 
                src="https://images.unsplash.com/photo-1507842217343-583bb7270b66" 
                alt="Library Background" 
                fill
                className="object-cover"
                quality={100}
                priority
                sizes="100vw"
              />
            </div>
          </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Find Your Perfect Reading Spot
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Discover, book, and enjoy library seats across the city. Reserve books in advance and never miss an event.
            </p>
            
            {/* Search Form */}
            <form 
              onSubmit={handleSearch}
              className="bg-white p-2 rounded-lg flex items-center shadow-lg max-w-2xl"
            >
              <div className="flex-grow flex items-center">
                <FiMapPin className="ml-2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter your city"
                  className="w-full p-2 focus:outline-none text-gray-800"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md flex items-center"
              >
                <FiSearch className="mr-2" />
                Find Libraries
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Our platform makes it easy to find and book library resources in just a few clicks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMapPin className="text-primary-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Libraries</h3>
              <p className="text-gray-600">
                Discover libraries near you with available seats, WiFi, AC, and more amenities
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiBook className="text-primary-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Reserve Books</h3>
              <p className="text-gray-600">
                Browse and reserve books ahead of time so they're ready when you arrive
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCalendar className="text-primary-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Book Seats</h3>
              <p className="text-gray-600">
                Select your preferred seat type, date, and time slot with real-time availability
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Libraries Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Featured Libraries</h2>
            <Link 
              href="/libraries" 
              className="text-primary-600 hover:text-primary-700 flex items-center"
            >
              View All <FiArrowRight className="ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto w-full">
            {featuredLibraries.map((library) => (
              // Featured Libraries
              <motion.div 
                key={library.id}
                whileHover={{ scale: 1.03 }}
                className={`${styles.library_card} overflow-hidden`}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={library.image}
                    alt={library.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={library.id <= 3}
                    className="object-cover"
                  />
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{library.name}</h3>
                  <p className="text-gray-500 text-sm mb-2">{library.address}</p>
                  <p className="text-gray-600 text-sm mb-2">
                    <span className="font-medium">Hours:</span> {library.openingHours}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {library.facilities.map((facility) => (
                      <span 
                        key={facility} 
                        className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                  <Link 
                    href={`/libraries/${library.id}`}
                    className="mt-4 text-primary-600 hover:text-primary-700 inline-flex items-center text-sm"
                  >
                    View Details <FiArrowRight className="ml-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Books Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Popular Books</h2>
            <Link 
              href="/books" 
              className="text-primary-600 hover:text-primary-700 flex items-center"
            >
              View All <FiArrowRight className="ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mx-auto w-full">
            {popularBooks.map((book) => (
              // Popular Books
              <motion.div 
                key={book.id}
                whileHover={{ scale: 1.05 }}
                className={styles.book_card}
              >
                <div className="relative h-56 w-full">
                  <Image
                    src={book.image}
                    alt={book.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    priority={book.id <= 4}
                    className="object-cover rounded-t-lg"
                  />
                  <div className="absolute top-2 right-2 z-10">
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        book.available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {book.available ? 'Available' : 'Borrowed'}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-md font-semibold mb-1 truncate">{book.title}</h3>
                  <p className="text-gray-600 text-sm mb-1">{book.author}</p>
                  <p className="text-gray-500 text-xs mb-3">{book.genre}</p>
                  <Link 
                    href={`/books/${book.id}`}
                    className="text-primary-600 hover:text-primary-700 inline-flex items-center text-sm"
                  >
                    View Details <FiArrowRight className="ml-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
            <Link 
              href="/events" 
              className="text-primary-600 hover:text-primary-700 flex items-center"
            >
              View All <FiArrowRight className="ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto w-full">
            {upcomingEvents.map((event) => (
              // Upcoming Events
              <motion.div 
                key={event.id}
                whileHover={{ scale: 1.03 }}
                className={styles.card}
              >
                <div className="relative h-40 w-full">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={event.id <= 3}
                    className="object-cover"
                  />
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">
                    <span className="font-medium">Date:</span> {event.date}
                  </p>
                  <p className="text-gray-600 text-sm mb-1">
                    <span className="font-medium">Time:</span> {event.time}
                  </p>
                  <p className="text-gray-600 text-sm mb-3">
                    <span className="font-medium">Location:</span> {event.location}
                  </p>
                  <Link 
                    href={`/events/${event.id}`}
                    className="btn btn-primary mt-2 w-full"
                  >
                    Register Now
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to find your perfect reading spot?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join thousands of readers who use our platform to discover libraries, book seats, and borrow books.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="btn bg-white text-primary-600 hover:bg-gray-100">
              Sign Up Now
            </Link>
            <Link href="/libraries" className="btn bg-primary-700 text-white hover:bg-primary-800">
              Browse Libraries
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

