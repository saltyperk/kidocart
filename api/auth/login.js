const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = client;
  return cachedDb;
}

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  phone: String,
  avatar: String,
  authProvider: String,
  isEmailVerified: Boolean,
  lastLogin: Date
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

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
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      await connectToDatabase();

      const { email, password } = req.body;

      // Validate inputs
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      // Find user
      const user = await User.findOne({ 
        email: email.toLowerCase().trim() 
      });

      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      // Check if user registered with Google
      if (user.authProvider === 'google' && !user.password) {
        return res.status(400).json({ 
          error: 'Please login with Google' 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

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

      const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      };

      console.log(`User logged in: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        user: userResponse
      });

    } catch (error) {
      console.error('Login Error:', error.message);
      
      return res.status(500).json({ 
        error: 'Login failed',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
