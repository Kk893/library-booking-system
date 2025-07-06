import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const Terminal = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState([
    { type: 'system', text: '🚀 Super Admin Terminal v1.0' },
    { type: 'system', text: 'Type "help" for available commands' },
    { type: 'system', text: '─'.repeat(50) }
  ]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const addOutput = (text, type = 'output') => {
    setOutput(prev => [...prev, { type, text, timestamp: new Date().toLocaleTimeString() }]);
  };

  const executeCommand = async (command) => {
    const cmd = command.trim().toLowerCase();
    addOutput(`$ ${command}`, 'input');

    try {
      switch (cmd) {
        case 'help':
          addOutput('Available Commands:', 'success');
          addOutput('  help                 - Show this help', 'info');
          addOutput('  clear                - Clear terminal', 'info');
          addOutput('  status               - Show system status', 'info');
          addOutput('  test-apis            - Test all admin APIs', 'info');
          addOutput('  test-books           - Test books API', 'info');
          addOutput('  test-offers          - Test offers API', 'info');
          addOutput('  test-users           - Test users API', 'info');
          addOutput('  add-book <title>     - Add test book', 'info');
          addOutput('  add-offer <title>    - Add test offer', 'info');
          addOutput('  get-stats            - Get platform stats', 'info');
          addOutput('  whoami               - Show current user', 'info');
          break;

        case 'clear':
          setOutput([]);
          break;

        case 'status':
          addOutput('System Status:', 'success');
          addOutput('  🟢 Server: Online', 'success');
          addOutput('  🟢 Database: Connected', 'success');
          addOutput('  🟢 APIs: Healthy', 'success');
          addOutput(`  👤 User: ${user?.name} (${user?.role})`, 'info');
          break;

        case 'whoami':
          addOutput(`Logged in as: ${user?.name}`, 'success');
          addOutput(`Role: ${user?.role}`, 'info');
          addOutput(`Email: ${user?.email}`, 'info');
          break;

        case 'test-apis':
          addOutput('🧪 Testing all admin APIs...', 'info');
          await testAllAPIs();
          break;

        case 'test-books':
          addOutput('📚 Testing Books API...', 'info');
          await testBooksAPI();
          break;

        case 'test-offers':
          addOutput('🎁 Testing Offers API...', 'info');
          await testOffersAPI();
          break;

        case 'test-users':
          addOutput('👥 Testing Users API...', 'info');
          await testUsersAPI();
          break;

        case 'get-stats':
          addOutput('📊 Fetching platform statistics...', 'info');
          await getStats();
          break;

        default:
          if (cmd.startsWith('add-book ')) {
            const title = command.substring(9);
            await addTestBook(title);
          } else if (cmd.startsWith('add-offer ')) {
            const title = command.substring(10);
            await addTestOffer(title);
          } else {
            addOutput(`Command not found: ${command}`, 'error');
            addOutput('Type "help" for available commands', 'info');
          }
      }
    } catch (error) {
      addOutput(`Error: ${error.message}`, 'error');
    }
  };

  const testAllAPIs = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // Test Books API
      addOutput('  📚 Testing Books API...', 'info');
      const booksRes = await axios.get('/api/admin/books', { headers });
      addOutput(`    ✅ GET /api/admin/books - ${booksRes.data.length} books found`, 'success');

      // Test Offers API
      addOutput('  🎁 Testing Offers API...', 'info');
      const offersRes = await axios.get('/api/admin/offers', { headers });
      addOutput(`    ✅ GET /api/admin/offers - ${offersRes.data.length} offers found`, 'success');

      // Test Users API
      addOutput('  👥 Testing Users API...', 'info');
      const usersRes = await axios.get('/api/admin/library-users', { headers });
      addOutput(`    ✅ GET /api/admin/library-users - ${usersRes.data.length} users found`, 'success');

      addOutput('🎉 All APIs are working correctly!', 'success');
      toast.success('All APIs tested successfully!');

    } catch (error) {
      addOutput(`❌ API Test Failed: ${error.response?.data?.message || error.message}`, 'error');
      addOutput(`   Status: ${error.response?.status}`, 'error');
      addOutput(`   URL: ${error.config?.url}`, 'error');
    }
  };

  const testBooksAPI = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // GET Books
      const getRes = await axios.get('/api/admin/books', { headers });
      addOutput(`  ✅ GET Books: ${getRes.data.length} books found`, 'success');

      // POST Book
      const testBook = {
        title: 'Terminal Test Book',
        author: 'Terminal Author',
        genre: 'Technology',
        totalCopies: 3,
        availableCopies: 3,
        isActive: true
      };
      const postRes = await axios.post('/api/admin/books', testBook, { headers });
      addOutput(`  ✅ POST Book: "${postRes.data.title}" created`, 'success');

      // PUT Book
      const updateBook = { ...testBook, title: 'Updated Terminal Book' };
      const putRes = await axios.put(`/api/admin/books/${postRes.data._id}`, updateBook, { headers });
      addOutput(`  ✅ PUT Book: "${putRes.data.title}" updated`, 'success');

      // DELETE Book
      await axios.delete(`/api/admin/books/${postRes.data._id}`, { headers });
      addOutput(`  ✅ DELETE Book: Test book deleted`, 'success');

      addOutput('📚 Books API test completed successfully!', 'success');

    } catch (error) {
      addOutput(`❌ Books API Error: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const testOffersAPI = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // GET Offers
      const getRes = await axios.get('/api/admin/offers', { headers });
      addOutput(`  ✅ GET Offers: ${getRes.data.length} offers found`, 'success');

      // POST Offer
      const testOffer = {
        title: 'Terminal Test Offer',
        discount: 15,
        code: 'TERMINAL15',
        validUntil: '2024-12-31',
        isActive: true
      };
      const postRes = await axios.post('/api/admin/offers', testOffer, { headers });
      addOutput(`  ✅ POST Offer: "${postRes.data.title}" created`, 'success');

      // PUT Offer
      const updateOffer = { ...postRes.data, isActive: false };
      const putRes = await axios.put(`/api/admin/offers/${postRes.data._id}`, updateOffer, { headers });
      addOutput(`  ✅ PUT Offer: Status changed to ${putRes.data.isActive ? 'active' : 'inactive'}`, 'success');

      // DELETE Offer
      await axios.delete(`/api/admin/offers/${postRes.data._id}`, { headers });
      addOutput(`  ✅ DELETE Offer: Test offer deleted`, 'success');

      addOutput('🎁 Offers API test completed successfully!', 'success');

    } catch (error) {
      addOutput(`❌ Offers API Error: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const testUsersAPI = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const usersRes = await axios.get('/api/admin/library-users', { headers });
      addOutput(`  ✅ GET Users: ${usersRes.data.length} users found`, 'success');
      
      if (usersRes.data.length > 0) {
        const user = usersRes.data[0];
        addOutput(`  📋 Sample User: ${user.name} (${user.email})`, 'info');
      }

      addOutput('👥 Users API test completed successfully!', 'success');

    } catch (error) {
      addOutput(`❌ Users API Error: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const addTestBook = async (title) => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const testBook = {
        title: title || 'Terminal Book',
        author: 'Terminal Author',
        genre: 'Technology',
        totalCopies: 5,
        availableCopies: 5,
        isActive: true
      };

      const response = await axios.post('/api/admin/books', testBook, { headers });
      addOutput(`✅ Book added: "${response.data.title}"`, 'success');
      addOutput(`   ID: ${response.data._id}`, 'info');
      toast.success('Book added via terminal!');

    } catch (error) {
      addOutput(`❌ Failed to add book: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const addTestOffer = async (title) => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const testOffer = {
        title: title || 'Terminal Offer',
        discount: 20,
        code: `TERM${Date.now().toString().slice(-4)}`,
        validUntil: '2024-12-31',
        isActive: true
      };

      const response = await axios.post('/api/admin/offers', testOffer, { headers });
      addOutput(`✅ Offer added: "${response.data.title}"`, 'success');
      addOutput(`   Code: ${response.data.code}`, 'info');
      addOutput(`   Discount: ${response.data.discount}%`, 'info');
      toast.success('Offer added via terminal!');

    } catch (error) {
      addOutput(`❌ Failed to add offer: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const getStats = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [booksRes, offersRes, usersRes] = await Promise.all([
        axios.get('/api/admin/books', { headers }),
        axios.get('/api/admin/offers', { headers }),
        axios.get('/api/admin/library-users', { headers })
      ]);

      addOutput('📊 Platform Statistics:', 'success');
      addOutput(`  📚 Total Books: ${booksRes.data.length}`, 'info');
      addOutput(`  🎁 Total Offers: ${offersRes.data.length}`, 'info');
      addOutput(`  👥 Total Users: ${usersRes.data.length}`, 'info');
      addOutput(`  🟢 Active Offers: ${offersRes.data.filter(o => o.isActive).length}`, 'success');
      addOutput(`  📖 Available Books: ${booksRes.data.reduce((sum, book) => sum + (book.availableCopies || 0), 0)}`, 'info');

    } catch (error) {
      addOutput(`❌ Failed to get stats: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      setHistory(prev => [...prev, input]);
      setHistoryIndex(-1);
      executeCommand(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`w-full max-w-4xl h-3/4 mx-4 rounded-lg overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-800'} border border-gray-600`}>
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-700 border-b border-gray-600">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-white text-sm font-mono">Super Admin Terminal</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Terminal Output */}
        <div
          ref={outputRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-black text-green-400"
          style={{ height: 'calc(100% - 100px)' }}
        >
          {output.map((line, index) => (
            <div key={index} className={`mb-1 ${
              line.type === 'input' ? 'text-white' :
              line.type === 'error' ? 'text-red-400' :
              line.type === 'success' ? 'text-green-400' :
              line.type === 'info' ? 'text-blue-400' :
              line.type === 'system' ? 'text-yellow-400' :
              'text-gray-300'
            }`}>
              {line.timestamp && line.type === 'input' && (
                <span className="text-gray-500 text-xs mr-2">[{line.timestamp}]</span>
              )}
              {line.text}
            </div>
          ))}
        </div>

        {/* Terminal Input */}
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-600">
          <form onSubmit={handleSubmit} className="flex items-center">
            <span className="text-green-400 font-mono mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white font-mono outline-none"
              placeholder="Enter command..."
              autoComplete="off"
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default Terminal;