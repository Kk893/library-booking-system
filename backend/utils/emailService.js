const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"Library Booking System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Send email verification email
const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
  const verificationUrl = `http://localhost:3000/verify-email/${verificationToken}`;
  const subject = 'Verify Your Email Address 📧';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📧 Verify Your Email</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Hello ${userName}! 👋</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Thank you for registering with Library Booking System! Please verify your email address to complete your account setup.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            ✅ Verify Email Address
          </a>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            ⚠️ This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
          Welcome to our community! 🎉<br>
          <strong>The Library Booking Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2024 Library Booking System. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  const subject = 'Welcome to Library Booking System! 📚';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📚 Welcome to Library Booking!</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Hello ${userName}! 👋</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Welcome to our Library Booking System! We're excited to have you join our community of book lovers and learners.
        </p>
        
        <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #4f46e5; margin-top: 0;">🎯 What you can do:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>🪑 Book library seats in advance</li>
            <li>📖 Reserve your favorite books</li>
            <li>🗺️ Find nearby libraries</li>
            <li>💰 Get exclusive offers and discounts</li>
            <li>📊 Track your booking history</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000/libraries" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            🚀 Start Exploring Libraries
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
          Happy Reading! 📚<br>
          <strong>The Library Booking Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2024 Library Booking System. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

// Send password reset email
const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
  const subject = 'Reset Your Password 🔐';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Hello ${userName}! 👋</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password for your Library Booking account.
        </p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            ⚠️ If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            🔑 Reset My Password
          </a>
        </div>
        
        <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>Security Note:</strong> This link will expire in 1 hour for your security. If you need to reset your password after that, please request a new reset link.
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
          Stay Safe! 🛡️<br>
          <strong>The Library Booking Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2024 Library Booking System. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

// Send booking confirmation email
const sendBookingConfirmationEmail = async (userEmail, userName, bookingDetails) => {
  const subject = 'Booking Confirmed! 🎉';
  const { type, libraryName, date, seatNumber, bookTitle, amount } = bookingDetails;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Hello ${userName}! 👋</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Great news! Your ${type === 'seat' ? 'seat booking' : 'book reservation'} has been confirmed.
        </p>
        
        <div style="background: #e8f5e8; border: 1px solid #4caf50; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin-top: 0;">📋 Booking Details:</h3>
          <ul style="color: #333; line-height: 1.8; list-style: none; padding: 0;">
            <li><strong>🏢 Library:</strong> ${libraryName}</li>
            <li><strong>📅 Date:</strong> ${new Date(date).toLocaleDateString()}</li>
            ${type === 'seat' ? `<li><strong>🪑 Seat:</strong> ${seatNumber}</li>` : `<li><strong>📚 Book:</strong> ${bookTitle}</li>`}
            <li><strong>💰 Amount:</strong> ₹${amount}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000/dashboard" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            📱 View My Bookings
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
          Enjoy your visit! 📚<br>
          <strong>The Library Booking Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2024 Library Booking System. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail
};