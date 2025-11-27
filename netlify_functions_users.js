const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const connection = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = connection;
  return cachedDb;
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: String,
  provider: { type: String, default: 'local' }, // 'local' or 'google'
  googleId: String,
  picture: String,
  addresses: [{ 
    id: Number,
    firstName: String,
    lastName: String,
    phone: String,
    address: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    isDefault: Boolean
  }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectToDatabase();
    
    const path = event.path.replace('/.netlify/functions/users', '').replace('/api/users', '');
    
    // REGISTER
    if (event.httpMethod === 'POST' && path === '/register') {
      const { name, email, password, phone } = JSON.parse(event.body);
      
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email already registered' })
        };
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = new User({
        name,
        email,
        password: hashedPassword,
        phone,
        provider: 'local'
      });
      
      await user.save();
      
      // Generate token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone
          }
        })
      };
    }
    
    // LOGIN
    if (event.httpMethod === 'POST' && path === '/login') {
      const { email, password } = JSON.parse(event.body);
      
      const user = await User.findOne({ email });
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid email or password' })
        };
      }
      
      // Check if user registered with Google
      if (user.provider === 'google' && !user.password) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Please login with Google' })
        };
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid email or password' })
        };
      }
      
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            addresses: user.addresses
          }
        })
      };
    }
    
    // GOOGLE LOGIN
    if (event.httpMethod === 'POST' && path === '/google') {
      const { googleId, email, name, picture } = JSON.parse(event.body);
      
      let user = await User.findOne({ email });
      
      if (!user) {
        // Create new user
        user = new User({
          name,
          email,
          googleId,
          picture,
          provider: 'google'
        });
        await user.save();
      } else if (!user.googleId) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.picture = picture;
        await user.save();
      }
      
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            picture: user.picture,
            addresses: user.addresses
          }
        })
      };
    }
    
    // GET USER PROFILE (Protected)
    if (event.httpMethod === 'GET' && path === '/profile') {
      const authHeader = event.headers.authorization;
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'No token provided' })
        };
      }
      
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(user)
      };
    }
    
    // UPDATE USER PROFILE (Protected)
    if (event.httpMethod === 'PUT' && path === '/profile') {
      const authHeader = event.headers.authorization;
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'No token provided' })
        };
      }
      
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const updates = JSON.parse(event.body);
      
      // Don't allow password update through this endpoint
      delete updates.password;
      
      const user = await User.findByIdAndUpdate(
        decoded.userId,
        updates,
        { new: true }
      ).select('-password');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(user)
      };
    }
    
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
