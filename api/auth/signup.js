const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not defined');
  }
  
  const client = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  cachedDb = client;
  return cachedDb;
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: { 
    type: String,
    sparse: true,
    index: true
  },
  password: { 
    type: String,
    minlength: 6
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  googleId: {
    type: String,
    sparse: true,
    index: true
  },
  avatar: String,
  authProvider: {
    type: String,
    enum: ['email', 'phone', 'google'],
    default: 'email'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: Date
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Sanitize input
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

module.exports = async (req, res) => {
  // CORS and security headers
  const allowedOrigins = [
    'https://www.kidocart.shop',
    'https://kidocart.shop',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      await connectToDatabase();

      const { name, email, password, phone } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({ 
          error: 'Name, email, and password are required' 
        });
      }

      // Sanitize inputs
      const sanitizedName = sanitizeInput(name);
      const sanitizedEmail = sanitizeInput(email).toLowerCase();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'Password must be at least 6 characters long' 
        });
      }

      // Check if password contains at least one number and one letter
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
          error: 'Password must contain at least one letter and one number' 
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: sanitizedEmail });
      
      if (existingUser) {
        return res.status(400).json({ 
          error: 'Email already registered. Please login instead.' 
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
        phone: phone ? sanitizeInput(phone) : null,
        authProvider: 'email',
        isEmailVerified: false,
        lastLogin: new Date()
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          name: user.name
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: '7d',
          algorithm: 'HS256'
        }
      );

      // Don't send password back
      const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      };

      console.log(`New user registered: ${user.email}`);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token: token,
        user: userResponse
      });

    } catch (error) {
      console.error('Signup Error:', error.message);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({ 
          error: 'Email already registered' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create account',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
