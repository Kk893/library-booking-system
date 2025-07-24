# LibraryBook Mobile Web Application - Detailed Page Analysis

## 1. Splash Screen
- **Background**: Solid red (#E53935) full screen
- **Logo**: White LibraryBook logo centered
- **App Name**: "LibraryBook" in white text below logo
- **Progress Indicator**: White circular progress at bottom
- **Duration**: 2 seconds before auto-redirect to Home
- **No Navigation**: No buttons or interactive elements

## 2. Home Screen
- **Header**:
  - Solid red (#E53935) bar at top
  - "LibraryBook" text in white, centered
  - No back button or menu icon

- **Banner Section**:
  - Large image with dark overlay
  - "Discover Libraries" text in white, bold, 24sp
  - "Find your perfect reading space" subtitle in white
  - "Explore Libraries" button (red background, white text, 4dp corners)

- **Quick Actions Grid** (2x2):
  - Book Seat: Icon + text
  - Find Books: Icon + text
  - My Bookings: Icon + text
  - Favorites: Icon + text
  - Each in white card with red icon and black text

- **Libraries Near You Section**:
  - Section title in black, bold, 18sp
  - Horizontal scrolling list of library cards
  - Each card shows:
    - Library image
    - Library name in bold
    - Location text
    - Star rating (out of 5)
    - "Book Now" button (red with white text)

- **Popular Libraries Section**:
  - Same format as Libraries Near You
  - Different set of libraries

- **Recently Added Section**:
  - Same format as above
  - Shows newest libraries

- **Top Rated Section**:
  - Same format as above
  - Shows highest rated libraries

- **Bottom Navigation**:
  - White background
  - 4 tabs: Home, Libraries, My Bookings, Profile
  - Active tab in red, others in gray
  - Fixed at bottom of screen

## 3. Libraries Screen
- **Header**:
  - Solid red bar with "Libraries" title in white

- **Search Bar**:
  - White card with slight elevation
  - Search icon on left
  - "Search libraries..." placeholder text
  - Full width with 16dp margins

- **Filter Options**:
  - Horizontal scrolling row of filter chips
  - Options: Location, Availability, Rating
  - White background with outline
  - Filter icon + text on each

- **Libraries Grid**:
  - 2-column grid of library cards
  - Each card shows:
    - Library image
    - Library name
    - Location
    - Rating
    - No "Book Now" button (unlike home screen)
  - Cards have 8dp corner radius
  - White background with slight elevation

- **Empty State** (when no libraries):
  - "No libraries found" text centered
  - Neutral gray text color

## 4. Library Details Screen
- **Header**:
  - Red bar with library name
  - Back button on left

- **Library Image**:
  - Full-width banner image at top
  - 200dp height

- **Library Info Card**:
  - White card with 8dp corners
  - Library name in bold, 24sp
  - Location with icon
  - Rating bar + number of ratings
  - Divider line
  - Description section with title and text

- **Available Seats Section**:
  - White card with 8dp corners
  - "Available Seats" title in bold
  - Number of available seats in green
  - Seat legend showing:
    - Green square: Available
    - Red square: Booked
    - Yellow square: Selected
  - Each with label underneath

- **Date Selection**:
  - White card with 8dp corners
  - "Select Date" title in bold
  - Horizontal scrolling row of date chips
  - Today's date selected by default (red background)
  - Other dates with outline

- **Time Slot Selection**:
  - White card with 8dp corners
  - "Select Time" title in bold
  - Three buttons: Morning, Afternoon, Evening
  - Equal width, outline style
  - Selected time slot has red background

- **Book Now Button**:
  - Full width with 16dp margins
  - Red background, white text
  - 4dp corner radius

## 5. Seat Selection Screen
- **Header**:
  - Red bar with "Select Seats" title
  - Back button on left
  - Step indicator (e.g., "Step 2/3")

- **Date & Time Info**:
  - Shows selected date and time slot
  - Gray background, black text

- **Seat Layout**:
  - Grid representation of seats
  - Color-coded: green (available), red (booked), yellow (selected)
  - Seats are square buttons with seat numbers
  - Screen indicator at top

- **Selected Seats Summary**:
  - Shows seats selected (e.g., "A1, A2")
  - Shows total price
  - White card with slight elevation

- **Proceed Button**:
  - Red background, white text
  - Fixed at bottom
  - 4dp corner radius

## 6. My Bookings Screen (Auth Required)
- **Header**:
  - Red bar with "My Bookings" title

- **Tabs**:
  - Three tabs: Upcoming, Past, Cancelled
  - Red indicator for active tab
  - White background

- **Booking Cards**:
  - White cards with 8dp corners
  - Library name and image
  - Date and time of booking
  - Seat number(s)
  - QR code (square, black and white)
  - Status indicator (color-coded)
  - Cancel button for upcoming bookings (red outline)

- **Empty State**:
  - "No bookings found" text centered
  - Shown when no bookings in selected tab

## 7. Profile Screen (Auth Required)
- **Header**:
  - Red bar with "Profile" title

- **User Info Card**:
  - Profile picture (circular)
  - User name in bold
  - Email address
  - Phone number
  - White card with slight elevation

- **Options Card**:
  - White card with 8dp corners
  - Options list:
    - Edit Profile (with right arrow icon)
    - Change Password (with right arrow icon)
    - Settings (with right arrow icon)
  - Each option has divider line below
  - Each is clickable row with ripple effect

- **Logout Button**:
  - Red background, white text
  - 4dp corner radius
  - 16dp margins on all sides

## 8. Login Screen
- **Header**:
  - Red bar with "Login" title

- **Content Card**:
  - White card with 8dp corners
  - App logo at top
  - "LibraryBook" text below logo
  - "Sign in to continue" subtitle

- **Form Fields**:
  - Email field (outline style)
  - Password field (outline style, with show/hide toggle)
  - "Forgot Password?" link (red text, right-aligned)

- **Login Button**:
  - Red background, white text
  - 4dp corner radius
  - Full width with 24dp margins

- **Register Link**:
  - "Don't have an account? Register" text
  - "Register" in red, bold
  - Centered at bottom of card

## 9. Register Screen
- **Header**:
  - Red bar with "Register" title

- **Content Card**:
  - White card with 8dp corners
  - App logo at top
  - "LibraryBook" text below logo
  - "Create an account" subtitle

- **Form Fields**:
  - Name field (outline style)
  - Email field (outline style)
  - Phone field (outline style)
  - Password field (outline style, with show/hide toggle)
  - Confirm Password field (outline style, with show/hide toggle)

- **Register Button**:
  - Red background, white text
  - 4dp corner radius
  - Full width with 24dp margins

- **Login Link**:
  - "Already have an account? Login" text
  - "Login" in red, bold
  - Centered at bottom of card

## 10. Payment Screen
- **Header**:
  - Red bar with "Payment" title
  - Back button on left

- **Booking Summary Card**:
  - White card with 8dp corners
  - Library name and image
  - Date and time of booking
  - Seat number(s)
  - Amount to pay
  - Divider line

- **Payment Options**:
  - Radio button selection
  - Options: Credit/Debit Card, UPI, Wallet
  - Each option expands to show relevant fields

- **Pay Button**:
  - Red background, white text
  - 4dp corner radius
  - Full width with 16dp margins

## 11. Booking Confirmation Screen
- **Header**:
  - Red bar with "Booking Confirmed" title

- **Success Animation**:
  - Green checkmark animation
  - "Booking Successful" text

- **Booking Details Card**:
  - White card with 8dp corners
  - Library name and image
  - Date and time of booking
  - Seat number(s)
  - QR code (large, centered)
  - Booking ID

- **Action Buttons**:
  - "View My Bookings" (red background)
  - "Back to Home" (outline style)
  - Both with 4dp corner radius