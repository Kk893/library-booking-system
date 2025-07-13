const Joi = require('joi');

// Password validation schema
const passwordSchema = Joi.string()
  .min(8)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
  .message('Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character');

// User registration validation
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  password: passwordSchema.required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  role: Joi.string().valid('user', 'admin', 'superadmin').optional()
});

// Login validation
const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().required()
});

// Library creation validation
const librarySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  address: Joi.string().min(10).max(200).required().trim(),
  city: Joi.string().min(2).max(50).required().trim(),
  area: Joi.string().min(2).max(50).required().trim(),
  pincode: Joi.string().pattern(/^[0-9]{6}$/).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  email: Joi.string().email().required().lowercase().trim(),
  openingHours: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
  }).required(),
  facilities: Joi.array().items(Joi.string().trim()).optional(),
  seatLayout: Joi.object({
    regular: Joi.object({
      count: Joi.number().min(0).max(1000).required(),
      price: Joi.number().min(0).max(10000).required()
    }),
    ac: Joi.object({
      count: Joi.number().min(0).max(1000).required(),
      price: Joi.number().min(0).max(10000).required()
    }),
    premium: Joi.object({
      count: Joi.number().min(0).max(1000).required(),
      price: Joi.number().min(0).max(10000).required()
    })
  }).optional()
});

// Book validation
const bookSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().trim(),
  author: Joi.string().min(1).max(100).required().trim(),
  genre: Joi.string().min(1).max(50).required().trim(),
  isbn: Joi.string().optional().trim(),
  description: Joi.string().max(1000).optional().trim(),
  totalCopies: Joi.number().min(1).max(1000).required(),
  language: Joi.string().min(2).max(50).optional().trim()
});

// Booking validation
const bookingSchema = Joi.object({
  libraryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  type: Joi.string().valid('seat', 'book').required(),
  date: Joi.date().min('now').required(),
  timeSlot: Joi.string().optional(),
  seatNumber: Joi.string().when('type', {
    is: 'seat',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  bookId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).when('type', {
    is: 'book',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  amount: Joi.number().min(0).max(100000).required()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        message: 'Validation error',
        errors
      });
    }
    
    next();
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  librarySchema,
  bookSchema,
  bookingSchema,
  validate
};