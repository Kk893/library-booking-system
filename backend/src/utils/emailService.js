const nodemailer = require('nodemailer');

/**
 * Create and configure the email transporter
 * In production, you would use a real SMTP service
 */
const configureTransporter = () => {
  // For development, use a test account or ethereal.email
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true' || false,
      auth: {
        user: process.env.EMAIL_USER || 'testuser',
        pass: process.env.EMAIL_PASS || 'testpassword',
      },
    });
  }
  
  // For production, use a real SMTP service
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.html - Email HTML content
 * @param {String} options.text - Email text content (fallback)
 * @returns {Promise} - Nodemailer send result
 */
const sendEmail = async (options) => {
  try {
    const transporter = configureTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Library Booking System" <no-reply@librarybooking.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // Log email URL for development (ethereal.email)
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send verification email to user
 * @param {String} email - User email
 * @param {String} name - User name
 * @param {String} token - Verification token
 * @returns {Promise} - Email send result
 */
const sendVerificationEmail = async (email, name, token) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email Address</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with LibraryBooking. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${verificationUrl}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify Email
        </a>
      </div>
      <p>If the button above doesn't work, you can also click on the link below or copy and paste it into your browser:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create an account, you can safely ignore this email.</p>
      <p>Best regards,<br>The LibraryBooking Team</p>
    </div>
  `;
  
  const text = `
    Verify Your Email Address
    
    Hello ${name},
    
    Thank you for registering with LibraryBooking. Please verify your email address by clicking on the link below:
    
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you did not create an account, you can safely ignore this email.
    
    Best regards,
    The LibraryBooking Team
  `;
  
  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address - LibraryBooking',
    html,
    text,
  });
};

/**
 * Send password reset email to user
 * @param {String} email - User email
 * @param {String} name - User name
 * @param {String} token - Reset token
 * @returns {Promise} - Email send result
 */
const sendPasswordResetEmail = async (email, name, token) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${resetUrl}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>If the button above doesn't work, you can also click on the link below or copy and paste it into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
      <p>Best regards,<br>The LibraryBooking Team</p>
    </div>
  `;
  
  const text = `
    Reset Your Password
    
    Hello ${name},
    
    We received a request to reset your password. Click on the link below to create a new password:
    
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you did not request a password reset, you can safely ignore this email.
    
    Best regards,
    The LibraryBooking Team
  `;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Password - LibraryBooking',
    html,
    text,
  });
};

/**
 * Send booking confirmation email to user
 * @param {String} email - User email
 * @param {String} name - User name
 * @param {Object} booking - Booking details
 * @returns {Promise} - Email send result
 */
const sendBookingConfirmationEmail = async (email, name, booking) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const bookingUrl = `${baseUrl}/booking-confirmation?bookingId=${booking._id}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Booking Confirmation</h2>
      <p>Hello ${name},</p>
      <p>Your booking has been confirmed. Here are your booking details:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 15px; margin: 20px 0;">
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Library:</strong> ${booking.libraryName}</p>
        <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
        <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
        <p><strong>Seat Type:</strong> ${booking.seatType}</p>
        <p><strong>Seats:</strong> ${booking.seats.join(', ')}</p>
        <p><strong>Amount Paid:</strong> $${booking.price.toFixed(2)}</p>
      </div>
      
      <p>You can view your booking details and QR code by clicking the button below:</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${bookingUrl}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          View Booking Details
        </a>
      </div>
      
      <p>Please show the QR code at the library entrance to check in.</p>
      
      <p>Thank you for using LibraryBooking!</p>
      
      <p>Best regards,<br>The LibraryBooking Team</p>
    </div>
  `;
  
  const text = `
    Booking Confirmation
    
    Hello ${name},
    
    Your booking has been confirmed. Here are your booking details:
    
    Booking ID: ${booking._id}
    Library: ${booking.libraryName}
    Date: ${new Date(booking.date).toLocaleDateString()}
    Time Slot: ${booking.timeSlot}
    Seat Type: ${booking.seatType}
    Seats: ${booking.seats.join(', ')}
    Amount Paid: $${booking.price.toFixed(2)}
    
    You can view your booking details and QR code by visiting:
    ${bookingUrl}
    
    Please show the QR code at the library entrance to check in.
    
    Thank you for using LibraryBooking!
    
    Best regards,
    The LibraryBooking Team
  `;
  
  return sendEmail({
    to: email,
    subject: 'Booking Confirmation - LibraryBooking',
    html,
    text,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
};