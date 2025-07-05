import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';

const Books = () => {
  const { id } = useParams();
  const [filters, setFilters] = useState({
    genre: '',
    author: '',
    language: '',
    search: '',
    available: false
  });

  const { data: books, isLoading } = useQuery(
    ['books', id, filters],
    () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      return axios.get(`/api/books/library/${id}?${params}`).then(res => res.data);
    }
  );

  const { data: filterOptions } = useQuery(
    ['book-filters', id],
    () => axios.get(`/api/books/library/${id}/filters`).then(res => res.data)
  );

  if (isLoading) return <div className="text-center">Loading books...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Library Books</h1>

      {/* Filters */}
      <div className="card">
        <div className="grid md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search books..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="input-field"
          />
          <select
            value={filters.genre}
            onChange={(e) => setFilters({...filters, genre: e.target.value})}
            className="input-field"
          >
            <option value="">All Genres</option>
            {filterOptions?.genres?.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
          <select
            value={filters.language}
            onChange={(e) => setFilters({...filters, language: e.target.value})}
            className="input-field"
          >
            <option value="">All Languages</option>
            {filterOptions?.languages?.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.available}
              onChange={(e) => setFilters({...filters, available: e.target.checked})}
              className="mr-2"
            />
            Available Only
          </label>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {books?.map(book => (
          <div key={book._id} className="card">
            {book.coverImage && (
              <img src={book.coverImage} alt={book.title} className="w-full h-48 object-cover rounded mb-4" />
            )}
            <h3 className="font-semibold mb-1">{book.title}</h3>
            <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
            <p className="text-xs text-gray-500 mb-2">{book.genre} • {book.language}</p>
            <p className="text-sm mb-4">Available: {book.availableCopies}/{book.totalCopies}</p>
            
            <Link to={`/books/${book._id}`} className="btn-primary w-full text-center">
              View Details
            </Link>
          </div>
        ))}
      </div>

      {books?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No books found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Books;