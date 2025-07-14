import React from 'react';
import { getImageUrl } from '../utils/imageUtils';

const ImageTest = () => {
  const testImages = [
    'uploads/books/sample-book-cover.png',
    'uploads/libraries/sample-library.png',
    'uploads/samples/sample.png'
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Image Test Component</h2>
      
      {/* Test direct URL */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Direct URL Test:</h3>
        <img 
          src="http://localhost:5000/uploads/books/sample-book-cover.png" 
          alt="Direct test"
          style={{ width: '100px', height: '100px', border: '1px solid red' }}
          onError={(e) => {
            console.error('Direct image failed to load');
            e.target.style.border = '2px solid red';
          }}
          onLoad={() => console.log('Direct image loaded successfully')}
        />
      </div>

      {/* Test with getImageUrl */}
      <div style={{ marginBottom: '20px' }}>
        <h3>getImageUrl Test:</h3>
        {testImages.map((imagePath, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <p>Path: {imagePath}</p>
            <p>URL: {getImageUrl(imagePath)}</p>
            <img 
              src={getImageUrl(imagePath)} 
              alt={`Test ${index}`}
              style={{ width: '100px', height: '100px', border: '1px solid blue' }}
              onError={(e) => {
                console.error(`Image ${index} failed to load:`, getImageUrl(imagePath));
                e.target.style.border = '2px solid red';
              }}
              onLoad={() => console.log(`Image ${index} loaded successfully`)}
            />
          </div>
        ))}
      </div>

      {/* Test server health */}
      <div>
        <h3>Server Test:</h3>
        <button onClick={async () => {
          try {
            const response = await fetch('http://localhost:5000/health');
            const data = await response.json();
            console.log('Server health:', data);
            alert('Server is running: ' + data.message);
          } catch (error) {
            console.error('Server test failed:', error);
            alert('Server test failed: ' + error.message);
          }
        }}>
          Test Server Connection
        </button>
      </div>
    </div>
  );
};

export default ImageTest;