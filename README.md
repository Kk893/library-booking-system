# Library Seat & Book Booking System

A full-stack web application that works as a library seat reservation and book borrowing system, where users can browse multiple libraries across cities, reserve books, and book paid reading seats with real-time seat layouts, similar to BookMyShow's movie booking system.

![Library Booking System](https://via.placeholder.com/800x400?text=Library+Booking+System)

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

### User-Side Functionality

- **User Registration & Authentication**
  - Email/Phone registration with OTP/password verification
  - Social login (Google, Facebook)
  - JWT/Firebase-based authentication

- **Library Discovery & Selection**
  - Browse/search libraries by city, area, name
  - View library details (opening hours, address, facilities)
  - Featured banners and available offers

- **Books & Events Section**
  - Browse books with filters (Genre, Author, Language, Availability)
  - Book detail pages with synopsis, author info, ISBN, etc.
  - Reserve books (Free/Paid based on library rules)
  - Browse and register for library events

- **Reading Seat Booking System**
  - Real-time seat availability with color-coded layout
  - Seat selection by type, date, and time slot
  - Dynamic pricing by seat type
  - Seat lock mechanism to avoid double booking

- **Checkout & Payment Flow**
  - Promo code and discount system
  - Multiple payment gateway options
  - Booking confirmation with QR code
  - Cancellation and rescheduling options

- **My Bookings Dashboard**
  - View reserved seats, borrowed books, and event registrations
  - Track status (Upcoming, Ongoing, Completed)
  - QR-based entry system
  - Feedback system

### Admin Panel Features

- **Book Management**
  - Add/Edit/Delete Books
  - Manage availability & borrowing policy

- **Seat Management**
  - Create/Edit seat layouts
  - Define seat categories and pricing
  - Real-time booking view

- **Event Management**
  - Schedule & manage library events
  - Set price/free, available slots, speakers, posters

- **Bookings Dashboard**
  - View current & upcoming bookings
  - Revenue reporting

- **Offers/Coupons Management**
  - Create and manage promotional offers

### Super Admin Panel

- Manage library branches
- Assign admins to libraries
- Global reporting
- User feedback management
- Global coupon campaigns

## Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: TailwindCSS with custom components
- **State Management**: React Context API, React Query
- **Animations**: Framer Motion
- **Form Handling**: React Hook Form with Yup validation

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Email Service**: Nodemailer
- **File Upload**: Multer with Cloudinary integration

### Third-Party Services
- **Image Hosting**: Cloudinary
- **Payment Gateways**: Razorpay / Stripe
- **Authentication**: Google OAuth, Facebook OAuth
- **Caching**: Redis (for seat locking mechanism)

### DevOps
- **Version Control**: Git
- **Deployment**: Vercel (Frontend), Render/Railway (Backend)
- **Database Hosting**: MongoDB Atlas
- **CI/CD**: GitHub Actions

## Project Structure

```
library-booking-system/
├── frontend/                  # Next.js frontend application
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── layout/        # Layout components (Navbar, Footer, etc.)
│   │   │   └── ui/            # UI components (Button, Card, etc.)
│   │   ├── contexts/          # React contexts for state management
│   │   ├── pages/             # Next.js pages
│   │   ├── styles/            # Global styles and Tailwind config
│   │   └── utils/             # Utility functions and helpers
│   ├── .env.local             # Environment variables (not in version control)
│   └── next.config.js         # Next.js configuration
│
├── backend/                   # Express.js backend application
│   ├── src/
│   │   ├── models/            # Mongoose models
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Custom middleware
│   │   ├── utils/             # Utility functions
│   │   └── index.js           # Entry point
│   ├── .env                   # Environment variables (not in version control)
│   └── package.json           # Backend dependencies
│
└── README.md                  # Project documentation
```

## Installation

### Prerequisites
- Node.js (v14 or later)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn package manager

### Clone the Repository
```bash
git clone https://github.com/yourusername/library-booking-system.git
cd library-booking-system
```

### Install Backend Dependencies
```bash
cd backend
npm install
```

### Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

## Environment Setup

### Backend (.env)
Copy the example environment file and update with your values:
```bash
cd backend
cp .env.example .env
```

Required environment variables:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Server port (default: 5000)
- Other service-specific variables as listed in `.env.example`

### Frontend (.env.local)
Copy the example environment file and update with your values:
```bash
cd frontend
cp .env.local.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_API_URL`: Backend API URL (e.g., http://localhost:5000/api)
- Other service-specific variables as listed in `.env.local.example`

## Development

### Run Backend Server
```bash
cd backend
npm run dev
```
The server will start on http://localhost:5000

### Run Frontend Development Server
```bash
cd frontend
npm run dev
```
The application will be available at http://localhost:3000

### Database Setup
The application will automatically create the necessary collections in MongoDB when first run. 

For development, you can seed the database with sample data:
```bash
cd backend
npm run seed
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify OTP
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Library Endpoints
- `GET /api/libraries` - List all libraries
- `GET /api/libraries/:id` - Get library details
- `GET /api/libraries/:id/seat-availability` - Get seat availability
- `GET /api/libraries/:id/books` - Get books in a library

### Book Endpoints
- `GET /api/books` - List all books
- `GET /api/books/:id` - Get book details
- `POST /api/books/:id/borrow` - Borrow a book
- `POST /api/books/:id/return` - Return a book
- `POST /api/books/:id/reserve` - Reserve a book

### Booking Endpoints
- `POST /api/bookings` - Create a new booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/cancel` - Cancel a booking

## Deployment

### Frontend (Vercel)
1. Create a Vercel account and connect your GitHub repository
2. Configure environment variables in Vercel dashboard
3. Deploy with `vercel` command or through Vercel dashboard

### Backend (Render/Railway)
1. Create an account on Render or Railway
2. Connect your GitHub repository
3. Configure environment variables
4. Set build command: `npm install`
5. Set start command: `npm start`

### Database (MongoDB Atlas)
1. Create a cluster on MongoDB Atlas
2. Set up network access and database users
3. Update the `MONGODB_URI` in your backend environment variables

## Contributing
Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License
This project is licensed under the MIT License - see the LICENSE file for details.