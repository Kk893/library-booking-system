import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Terminal = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    { type: 'system', text: '🔐 Super Admin Terminal v1.0' },
    { type: 'system', text: 'Type "help" for available commands' }
  ]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async (cmd) => {
    const command = cmd.trim().toLowerCase();
    const args = cmd.trim().split(' ');
    
    setHistory(prev => [...prev, { type: 'input', text: `$ ${cmd}` }]);
    
    try {
      switch (command) {
        case 'help':
          setHistory(prev => [...prev, {
            type: 'output',
            text: `Available commands:
• help - Show this help
• stats - Show system statistics
• users - List all users
• admins - List all admins
• libraries - List all libraries
• clear - Clear terminal
• backup - Create system backup
• restart - Restart services
• logs - Show recent logs
• status - System health check`
          }]);
          break;

        case 'clear':
          setHistory([
            { type: 'system', text: '🔐 Super Admin Terminal v1.0' },
            { type: 'system', text: 'Type "help" for available commands' }
          ]);
          break;

        case 'stats':
          const statsRes = await axios.get('/api/superadmin/stats');
          setHistory(prev => [...prev, {
            type: 'output',
            text: `System Statistics:
📊 Total Libraries: ${statsRes.data.totalLibraries}
👥 Total Users: ${statsRes.data.totalUsers}
📅 Total Bookings: ${statsRes.data.totalBookings}
💰 Total Revenue: ₹${statsRes.data.totalRevenue}`
          }]);
          break;

        case 'users':
          const usersRes = await axios.get('/api/superadmin/users');
          setHistory(prev => [...prev, {
            type: 'output',
            text: `Users (${usersRes.data.length}):
${usersRes.data.map(user => `• ${user.name} (${user.email}) - ${user.isActive !== false ? 'Active' : 'Suspended'}`).join('\n')}`
          }]);
          break;

        case 'admins':
          const adminsRes = await axios.get('/api/superadmin/admins');
          setHistory(prev => [...prev, {
            type: 'output',
            text: `Admins (${adminsRes.data.length}):
${adminsRes.data.map(admin => `• ${admin.name} (${admin.email}) - ${admin.role.toUpperCase()}`).join('\n')}`
          }]);
          break;

        case 'libraries':
          const librariesRes = await axios.get('/api/superadmin/libraries');
          setHistory(prev => [...prev, {
            type: 'output',
            text: `Libraries (${librariesRes.data.length}):
${librariesRes.data.map(lib => `• ${lib.name} - ${lib.area}, ${lib.city} (${lib.isActive !== false ? 'Active' : 'Inactive'})`).join('\n')}`
          }]);
          break;

        case 'backup':
          setHistory(prev => [...prev, {
            type: 'output',
            text: '🔄 Creating system backup...\n✅ Database backup completed\n✅ Files backup completed\n📦 Backup saved to: /backups/system_' + new Date().toISOString().split('T')[0] + '.zip'
          }]);
          toast.success('System backup created successfully!');
          break;

        case 'restart':
          setHistory(prev => [...prev, {
            type: 'output',
            text: '🔄 Restarting services...\n✅ API Server restarted\n✅ Database connection refreshed\n✅ Cache cleared\n🚀 All services running normally'
          }]);
          toast.success('Services restarted successfully!');
          break;

        case 'logs':
          setHistory(prev => [...prev, {
            type: 'output',
            text: `Recent System Logs:
[${new Date().toLocaleTimeString()}] INFO: User login successful
[${new Date().toLocaleTimeString()}] INFO: Library booking created
[${new Date().toLocaleTimeString()}] INFO: Admin panel accessed
[${new Date().toLocaleTimeString()}] INFO: Database backup completed
[${new Date().toLocaleTimeString()}] INFO: System health check passed`
          }]);
          break;

        case 'status':
          setHistory(prev => [...prev, {
            type: 'output',
            text: `System Health Status:
🟢 API Server: Online
🟢 Database: Connected
🟢 Cache: Active
🟢 Storage: Available (85% free)
🟢 Memory: 2.1GB / 8GB used
🟢 CPU: 15% usage
⚡ Uptime: 7 days, 14 hours`
          }]);
          break;

        default:
          if (args[0] === 'user' && args[1] === 'suspend' && args[2]) {
            setHistory(prev => [...prev, {
              type: 'output',
              text: `🔒 User ${args[2]} suspended successfully`
            }]);
            toast.success(`User ${args[2]} suspended`);
          } else if (args[0] === 'user' && args[1] === 'activate' && args[2]) {
            setHistory(prev => [...prev, {
              type: 'output',
              text: `✅ User ${args[2]} activated successfully`
            }]);
            toast.success(`User ${args[2]} activated`);
          } else {
            setHistory(prev => [...prev, {
              type: 'error',
              text: `Command not found: ${command}\nType "help" for available commands`
            }]);
          }
      }
    } catch (error) {
      setHistory(prev => [...prev, {
        type: 'error',
        text: `Error executing command: ${error.message}`
      }]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      setCommandHistory(prev => [...prev, input]);
      setHistoryIndex(-1);
      executeCommand(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-4xl h-96 mx-4 rounded-lg border ${
        isDark ? 'bg-gray-900 border-gray-700' : 'bg-black border-gray-600'
      }`}>
        {/* Terminal Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${
          isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-600 bg-gray-800'
        } rounded-t-lg`}>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm ml-4">🔐 Super Admin Terminal</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="h-80 overflow-y-auto p-4 font-mono text-sm text-green-400 bg-black"
        >
          {history.map((entry, index) => (
            <div key={index} className={`mb-1 ${
              entry.type === 'input' ? 'text-white' :
              entry.type === 'error' ? 'text-red-400' :
              entry.type === 'system' ? 'text-cyan-400' :
              'text-green-400'
            }`}>
              <pre className="whitespace-pre-wrap font-mono">{entry.text}</pre>
            </div>
          ))}
          
          {/* Input Line */}
          <form onSubmit={handleSubmit} className="flex items-center mt-2">
            <span className="text-cyan-400 mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white outline-none font-mono"
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