const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testAdminAPIs() {
  console.log('🧪 Testing Admin Panel APIs...\n');

  try {
    // Test 1: Get Books
    console.log('📚 Testing GET /api/admin/books');
    const booksResponse = await axios.get(`${API_BASE}/api/admin/books`);
    console.log('✅ Books API working:', booksResponse.data.length, 'books found');

    // Test 2: Add Book
    console.log('\n📚 Testing POST /api/admin/books');
    const newBook = {
      title: 'Test Book API',
      author: 'Test Author',
      genre: 'Technology',
      totalCopies: 5,
      availableCopies: 5,
      description: 'Test book for API testing',
      isActive: true
    };
    const addBookResponse = await axios.post(`${API_BASE}/api/admin/books`, newBook);
    console.log('✅ Add Book API working:', addBookResponse.data.title);
    const testBookId = addBookResponse.data._id;

    // Test 3: Update Book
    console.log('\n📚 Testing PUT /api/admin/books/:id');
    const updateBook = { ...newBook, title: 'Updated Test Book' };
    const updateResponse = await axios.put(`${API_BASE}/api/admin/books/${testBookId}`, updateBook);
    console.log('✅ Update Book API working:', updateResponse.data.title);

    // Test 4: Get Offers
    console.log('\n🎁 Testing GET /api/admin/offers');
    const offersResponse = await axios.get(`${API_BASE}/api/admin/offers`);
    console.log('✅ Offers API working:', offersResponse.data.length, 'offers found');

    // Test 5: Add Offer
    console.log('\n🎁 Testing POST /api/admin/offers');
    const newOffer = {
      title: 'Test Offer API',
      discount: 25,
      code: 'TESTAPI25',
      validUntil: '2024-12-31',
      description: 'Test offer for API testing',
      isActive: true
    };
    const addOfferResponse = await axios.post(`${API_BASE}/api/admin/offers`, newOffer);
    console.log('✅ Add Offer API working:', addOfferResponse.data.title);
    const testOfferId = addOfferResponse.data._id;

    // Test 6: Update Offer
    console.log('\n🎁 Testing PUT /api/admin/offers/:id');
    const updateOffer = { ...addOfferResponse.data, isActive: false };
    const updateOfferResponse = await axios.put(`${API_BASE}/api/admin/offers/${testOfferId}`, updateOffer);
    console.log('✅ Update Offer API working, isActive:', updateOfferResponse.data.isActive);

    // Test 7: Get Users
    console.log('\n👥 Testing GET /api/admin/library-users');
    const usersResponse = await axios.get(`${API_BASE}/api/admin/library-users`);
    console.log('✅ Users API working:', usersResponse.data.length, 'users found');

    // Test 8: Delete Test Data
    console.log('\n🗑️ Cleaning up test data...');
    await axios.delete(`${API_BASE}/api/admin/books/${testBookId}`);
    await axios.delete(`${API_BASE}/api/admin/offers/${testOfferId}`);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All Admin APIs are working correctly!');

  } catch (error) {
    console.error('❌ API Test Failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

testAdminAPIs();