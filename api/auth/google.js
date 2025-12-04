const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const dbClient = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = dbClient;
  return cachedDb;
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  name: String,
  googleId: { type: String, sparse: true },
  avatar: String,
  authProvider: String,
  isEmailVerified: Boolean,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = async (req, res) => {
  // CORS headers
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      await connectToDatabase();

      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({ error: 'Google credential required' });
      }

      // Verify Google token
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const { sub: googleId, email, name, picture } = payload;

      // Find or create user
      let user = await User.findOne({ 
        $or: [
          { googleId: googleId },
          { email: email }
        ]
      });

      if (user) {
        // Update existing user
        if (!user.googleId) {
          user.googleId = googleId;
        }
        user.avatar = picture;
        user.lastLogin = new Date();
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          email: email,
          name: name,
          googleId: googleId,
          avatar: picture,
          authProvider: 'google',
          isEmailVerified: true, // Google emails are verified
          lastLogin: new Date()
        });
      }

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
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      };

      console.log(`Google login: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        user: userResponse
      });

    } catch (error) {
      console.error('Google Auth Error:', error.message);
      
      return res.status(500).json({ 
        error: 'Google authentication failed',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
