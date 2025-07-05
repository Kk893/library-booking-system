import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';

const LibraryDetail = () => {
  const { id } = useParams();
  
  const { data: library, isLoading } = useQuery(
    ['library', id],
    () => axios.get(`/api/libraries/${id}`).then(res => res.data)
  );

  if (isLoading) return <div className="text-center">Loading...</div>;
  if (!library) return <div className="text-center">Library not found</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold mb-4">{library.name}</h1>
        <p className="text-gray-600 mb-4">{library.address}</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Opening Hours</h3>
            <p>{library.openingHours.open} - {library.openingHours.close}</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Facilities</h3>
            <div className="flex flex-wrap gap-2">
              {library.facilities?.map(facility => (
                <span key={facility} className="px-2 py-1 bg-primary-100 text-primary-700 text-sm rounded">
                  {facility}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4 mt-6">
          <Link to={`/seat-booking/${library._id}`} className="btn-primary">
            Book Seat
          </Link>
          <Link to={`/libraries/${library._id}/books`} className="btn-secondary">
            Browse Books
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LibraryDetail;