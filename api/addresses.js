const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB connection with security
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  
  const client = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  cachedDb = client;
  return cachedDb;
}

// Address Schema
const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  address: { type: String, required: true, trim: true, maxlength: 200 },
  apartment: { type: String, trim: true, maxlength: 50 },
  city: { type: String, required: true, trim: true, maxlength: 50 },
  state: { type: String, required: true, trim: true, maxlength: 50 },
  pincode: { type: String, required: true, match: /^[0-9]{6}$/ },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add index for faster queries
addressSchema.index({ userId: 1, isDefault: -1 });

const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);

// Verify JWT token with security checks
function verifyToken(authHeader) {
  if (!authHeader) return null;
  
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token format
    if (!token || token.split('.').length !== 3) {
      return null;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      maxAge: '7d' // Token expires in 7 days
    });
    
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

// Sanitize input to prevent injection
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

module.exports = async (req, res) => {
  // CORS with strict origin
  const allowedOrigins = [
    'https://www.kidocart.shop',
    'https://kidocart.shop',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();

    const decoded = verifyToken(req.headers.authorization);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
    }

    const userId = decoded.userId;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // GET - Get all addresses
    if (req.method === 'GET') {
      const addresses = await Address.find({ userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .limit(10) // Limit to prevent abuse
        .lean();
      
      return res.status(200).json(addresses);
    }

    // POST - Create new address
    if (req.method === 'POST') {
      const addressData = req.body;

      // Validate required fields
      if (!addressData.firstName || !addressData.lastName || !addressData.address || 
          !addressData.city || !addressData.state || !addressData.pincode) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate PIN code format
      if (!/^[0-9]{6}$/.test(addressData.pincode)) {
        return res.status(400).json({ error: 'Invalid PIN code format' });
      }

      // Check address count limit per user
      const addressCount = await Address.countDocuments({ userId });
      if (addressCount >= 10) {
        return res.status(400).json({ error: 'Maximum address limit reached (10)' });
      }

      // Sanitize inputs
      const sanitizedData = {
        firstName: sanitizeInput(addressData.firstName),
        lastName: sanitizeInput(addressData.lastName),
        address: sanitizeInput(addressData.address),
        apartment: addressData.apartment ? sanitizeInput(addressData.apartment) : '',
        city: sanitizeInput(addressData.city),
        state: sanitizeInput(addressData.state),
        pincode: addressData.pincode,
        userId
      };

      // If this is the first address or marked as default
      const existingCount = await Address.countDocuments({ userId });
      
      if (existingCount === 0 || addressData.isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
        sanitizedData.isDefault = true;
      }

      const address = new Address(sanitizedData);
      await address.save();
      
      return res.status(201).json(address);
    }

    // PUT - Update address
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid address ID' });
      }

      const updates = req.body;

      // Sanitize updates
      const sanitizedUpdates = {};
      if (updates.firstName) sanitizedUpdates.firstName = sanitizeInput(updates.firstName);
      if (updates.lastName) sanitizedUpdates.lastName = sanitizeInput(updates.lastName);
      if (updates.address) sanitizedUpdates.address = sanitizeInput(updates.address);
      if (updates.apartment) sanitizedUpdates.apartment = sanitizeInput(updates.apartment);
      if (updates.city) sanitizedUpdates.city = sanitizeInput(updates.city);
      if (updates.state) sanitizedUpdates.state = sanitizeInput(updates.state);
      if (updates.pincode && /^[0-9]{6}$/.test(updates.pincode)) {
        sanitizedUpdates.pincode = updates.pincode;
      }
      
      sanitizedUpdates.updatedAt = new Date();

      if (updates.isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
        sanitizedUpdates.isDefault = true;
      }

      const address = await Address.findOneAndUpdate(
        { _id: id, userId }, // Ensure user owns this address
        sanitizedUpdates,
        { new: true, runValidators: true }
      );

      if (!address) {
        return res.status(404).json({ error: 'Address not found' });
      }

      return res.status(200).json(address);
    }

    // DELETE - Remove address
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid address ID' });
      }

      const address = await Address.findOneAndDelete({ _id: id, userId });

      if (!address) {
        return res.status(404).json({ error: 'Address not found' });
      }

      // If deleted address was default, make another one default
      if (address.isDefault) {
        const firstAddress = await Address.findOne({ userId }).sort({ createdAt: -1 });
        if (firstAddress) {
          firstAddress.isDefault = true;
          await firstAddress.save();
        }
      }

      return res.status(200).json({ message: 'Address deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Address API Error:', error.message);
    
    // Don't expose internal errors
    return res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};
