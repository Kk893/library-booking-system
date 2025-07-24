# LibraryBook Mobile Web Application - Detailed Explanation

## Overview
LibraryBook is a BookMyShow-inspired web application for library seat reservations and book borrowing. The application follows a mobile-first design approach with a focus on user experience similar to BookMyShow's movie booking system.

## Visual Design
- **Color Scheme**: Primary red (#E53935) with white backgrounds and dark text
- **Typography**: Poppins font family throughout the application
- **Card Design**: Simple cards with 8dp corner radius and subtle elevation
- **Buttons**: Red buttons with 4dp corner radius and white text

## Application Flow

### 1. Splash Screen
- Full-screen red background with white LibraryBook logo
- Progress indicator at bottom
- Automatically redirects to Home screen after 2 seconds
- No authentication check at this stage

### 2. Main Navigation
- Bottom navigation bar with 4 tabs:
  - Home
  - Libraries
  - My Bookings (requires login)
  - Profile (requires login)
- Navigation bar is fixed at bottom with white background and red icons/text for selected tab

### 3. Home Screen
- **Header**: Red header bar with app name centered in white text
- **Banner**: Large banner with dark overlay and white text promoting library discovery
- **Quick Actions**: Four action buttons in a grid layout:
  - Book Seat (redirects to library selection)
  - Find Books (redirects to libraries tab)
  - My Bookings (requires login, redirects to bookings tab)
  - Favorites (requires login)
- **Library Sections**: Horizontal scrolling lists of libraries:
  - Libraries Near You
  - Popular Libraries
  - Recently Added
  - Top Rated
- Each library card shows:
  - Library image
  - Library name
  - Location
  - Rating (out of 5 stars)
  - "Book Now" button

### 4. Libraries Screen
- **Header**: Red header bar with "Libraries" title
- **Search Bar**: At top for searching libraries
- **Filter Options**: Location, Availability, Rating
- **Library Grid**: 2-column grid of library cards
- Each library card shows:
  - Library image
  - Library name
  - Location
  - Rating
  - "Book Now" button

### 5. Library Details Screen
- **Header**: Red header bar with back button and library name
- **Library Image**: Large banner image at top
- **Library Info**: Name, location, rating, description
- **Seat Availability**: Visual indicator of available/booked seats
- **Seat Legend**: Color-coded indicators for:
  - Available (green)
  - Booked (red)
  - Selected (yellow)
- **Date Selection**: Calendar for selecting booking date
- **Time Slot Selection**: Morning, Afternoon, Evening options
- **Book Now Button**: Large red button at bottom

### 6. Seat Selection Screen
- **Header**: Red header bar with step indicator
- **Seat Layout**: Grid of seats with color coding
- **Selected Seats**: Summary of selected seats
- **Price Calculation**: Based on selected seats and time
- **Proceed Button**: To continue to payment

### 7. My Bookings Screen (Auth Required)
- **Header**: Red header bar with "My Bookings" title
- **Tabs**: Three tabs for filtering bookings:
  - Upcoming
  - Past
  - Cancelled
- **Booking Cards**: Each showing:
  - Library name and image
  - Date and time of booking
  - Seat number(s)
  - QR code for entry
  - Cancel booking option (for upcoming bookings)
- **Empty State**: Message when no bookings are found

### 8. Profile Screen (Auth Required)
- **Header**: Red header bar with "Profile" title
- **User Info**: Profile picture, name, email, phone
- **Options**:
  - Edit Profile
  - Change Password
  - Settings
  - Logout
- **Membership Info**: Membership level, points, etc.

### 9. Authentication Screens
- **Login Screen**:
  - App logo
  - Email and password fields
  - "Forgot Password" link
  - Login button
  - "Register" link for new users
- **Register Screen**:
  - App logo
  - Name, email, phone, password fields
  - Register button
  - "Login" link for existing users
- **Forgot Password Screen**:
  - Email field
  - Send reset link button

### 10. Payment Flow
- **Payment Summary**: Booking details and amount
- **Payment Options**: Credit/debit card, UPI, wallet
- **Razorpay Integration**: External payment gateway
- **Confirmation**: Success/failure message
- **Booking Confirmation**: With QR code and details

## Authentication Logic
- Home and Libraries tabs accessible without login
- My Bookings and Profile tabs require login
- When clicking on protected tabs without login, redirect to login screen
- After successful login, redirect back to the originally requested tab
- Login state persisted using JWT tokens in localStorage

## Special Features
- **Location Detection**: Auto-detects user location to show nearby libraries
- **Real-time Seat Updates**: Shows seat availability in real-time
- **QR Code Generation**: For contactless entry
- **Rating System**: Users can rate libraries and see average ratings
- **Search & Filters**: Advanced search with multiple filter options

## Admin Features
- Separate admin login (not visible in main navigation)
- Admin dashboard with statistics
- Library management (add/edit/delete)
- Book management
- User management
- Booking reports

## Technical Implementation
- **Frontend**: React.js with hooks
- **State Management**: React Query
- **Styling**: Tailwind CSS with custom components
- **API Communication**: Axios for REST API calls
- **Authentication**: JWT tokens
- **Maps Integration**: Google Maps API
- **Responsive Design**: Mobile-first approach with desktop support

## User Experience Notes
- Smooth transitions between screens
- Loading indicators during API calls
- Error handling with user-friendly messages
- Form validation with immediate feedback
- Persistent login state
- Offline support for viewing existing bookings