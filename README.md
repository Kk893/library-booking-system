# 📚 LibraryBook - Multi-Library Seat & Book Booking System

A comprehensive full-stack web application for library seat reservations and book borrowing, similar to BookMyShow's movie booking system but for libraries.

## 🚀 Features

### User Features
- **User Authentication**: Register/Login with JWT authentication
- **Library Discovery**: Browse libraries by city, area, and search
- **Location-Based Search**: Auto-detect user location and show nearby libraries
- **Interactive Maps**: Google Maps integration with real-time location
- **Seat Booking**: Real-time seat selection with color-coded availability
- **Book Reservation**: Browse and reserve books with filters
- **Payment Integration**: Razorpay payment gateway
- **My Bookings**: Dashboard with QR codes for entry
- **Responsive Design**: macOS-style UI with glassmorphism effects

### Admin Features
- **Library Admin Panel**: Manage books, view bookings, revenue reports
- **Super Admin Panel**: Manage libraries, assign admins, platform analytics
- **Real-time Dashboard**: Statistics and recent activity
- **Book Management**: Add/edit/delete books with cover images

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js**
- **MongoDB** with Mongoose
- **JWT** Authentication
- **Razorpay** Payment Gateway
- **Redis** for caching (optional)
- **Cloudinary** for image storage

### Frontend
- **React.js** with Hooks
- **React Router** for navigation
- **React Query** for state management
- **Tailwind CSS** for styling
- **Google Maps API** for location services
- **Axios** for API calls
- **React Hot Toast** for notifications

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use MongoDB Atlas
- **Git** - [Download here](https://git-scm.com/)
- **Code Editor** - VS Code recommended

## 🚀 Installation & Setup

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd library
```

### Step 2: Install Dependencies

#### Install Backend Dependencies
```bash
cd backend
npm install
```

#### Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### Step 3: Environment Configuration

#### Backend Environment (.env)
Create a `.env` file in the `backend` folder:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/library-booking
JWT_SECRET=your-super-secret-jwt-key-here
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

#### Frontend Environment (.env)
Create a `.env` file in the `frontend` folder:
```env
REACT_APP_RAZORPAY_KEY_ID=your-razorpay-key-id
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Step 4: Database Setup

#### Option 1: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS
   brew services start mongodb/brew/mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

#### Option 2: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and update `MONGODB_URI` in `.env`

### Step 5: Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Maps JavaScript API" and "Places API"
4. Create API key
5. Add restrictions:
   - HTTP referrers: `http://localhost:3000/*`
   - API restrictions: Maps JavaScript API, Places API
6. Update API key in frontend `.env` file

**Note**: The project currently uses GoMaps.pro as a free alternative to Google Maps.

### Step 6: Payment Gateway Setup (Optional)

1. Create account at [Razorpay](https://razorpay.com/)
2. Get API keys from dashboard
3. Update keys in both backend and frontend `.env` files

## 🏃‍♂️ Running the Project

### Method 1: Run Both Servers Separately

#### Terminal 1 - Backend Server
```bash
cd backend
npm start
```
Server will run on: http://localhost:5000

#### Terminal 2 - Frontend Server
```bash
cd frontend
npm start
```
Application will open on: http://localhost:3000

### Method 2: Run Both Servers Together (if configured)
```bash
# From root directory
npm run dev
```

## 🎯 Default Access

### User Access
- Register new account or use demo credentials
- Browse libraries and book seats
- View bookings in "My Bookings"

### Admin Access
**Secret Keyboard Shortcuts** (No visible buttons):
- **Library Admin**: `Ctrl + Shift + A`
- **Super Admin**: `Ctrl + Shift + S`

**Demo Admin Credentials**:
- **Library Admin**: admin@library.com / admin123
- **Super Admin**: super@admin.com / super123

### Direct URL Access
- **Admin Login**: http://localhost:3000/admin-login
- **Admin Panel**: http://localhost:3000/admin
- **Super Admin**: http://localhost:3000/superadmin

## 📱 Features Guide

### 🗺️ Location-Based Discovery
1. **Auto Location**: App detects your location automatically
2. **Manual Selection**: Use city dropdown if location is blocked
3. **Nearby Libraries**: Shows libraries within 25km radius
4. **Interactive Map**: Click markers to view library details

### 🎫 Seat Booking Process
1. **Select Library**: Choose from nearby or search results
2. **Pick Date & Time**: Select preferred slot
3. **Choose Seats**: Interactive seat selection
4. **Payment**: Secure Razorpay integration
5. **QR Code**: Get entry QR code after booking

### 👨‍💼 Admin Features
1. **Library Management**: Add/edit libraries with pincode-based location
2. **Book Management**: Add books with cover images
3. **Booking Analytics**: View revenue and booking statistics
4. **User Management**: Assign admin roles

## 🔧 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Check if MongoDB is running
# Windows
sc query MongoDB

# macOS/Linux
brew services list | grep mongodb
```

#### 2. Port Already in Use
```bash
# Kill process on port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

#### 3. Location Not Working
- Enable location access in browser
- Check browser console for errors
- Use manual city selection as fallback

#### 4. Google Maps Not Loading
- Verify API key is correct
- Check API key restrictions
- Ensure billing is enabled (for Google Maps)

### 🔍 Debug Mode
Add to your `.env` files:
```env
NODE_ENV=development
DEBUG=true
```

## 📁 Project Structure

```
library/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication & validation
│   ├── server.js        # Express server
│   └── .env            # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── styles/      # CSS files
│   │   └── utils/       # Utility functions
│   ├── public/          # Static assets
│   └── .env            # Frontend environment variables
├── README.md           # This file
└── package.json        # Root package file
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Libraries
- `GET /api/libraries` - Get all libraries
- `GET /api/libraries/nearby` - Get nearby libraries
- `GET /api/libraries/:id` - Get library details

### Bookings
- `POST /api/bookings/seats` - Create seat booking
- `GET /api/bookings/my-bookings` - Get user bookings

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data
- `POST /api/admin/libraries` - Create library
- `POST /api/admin/create-admin` - Create admin user

## 🎨 UI Features

### macOS-Style Design
- **Glassmorphism Effects**: Backdrop blur and transparency
- **Traffic Light Controls**: macOS window controls
- **System Colors**: Official macOS color palette
- **Smooth Animations**: Fade-in effects and transitions

### Responsive Design
- **Desktop**: Full-featured experience
- **Tablet**: Optimized layout
- **Mobile**: Touch-friendly interface

## 🔐 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- API rate limiting
- CORS configuration
- Role-based access control

## 📈 Performance Optimization

- React Query for efficient data fetching
- Image optimization with Cloudinary
- Lazy loading for components
- Caching strategies
- Optimized database queries

## 🚀 Deployment

### Backend (Railway/Render)
1. Connect GitHub repository
2. Set environment variables
3. Deploy with automatic builds

### Frontend (Vercel/Netlify)
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set environment variables
4. Deploy

### Database (MongoDB Atlas)
1. Create cluster
2. Update connection string
3. Set up database users

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and queries:
- Create an issue on GitHub
- Check troubleshooting section above
- Review console logs for specific errors

## 🎯 Future Enhancements

- [ ] Push notifications
- [ ] Social login integration
- [ ] Mobile app (React Native)
- [ ] AI-powered recommendations
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

---

**Happy Coding! 🚀**

Made with ❤️ for library enthusiasts everywhere.#   l i b r a r y - b o o k i n g  
 