const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  cachedDb = client;
  return cachedDb;
}

// Address Schema
const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  address: { type: String, required: true },
  apartment: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);

// Verify JWT token
function verifyToken(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();

    const decoded = verifyToken(req.headers.authorization);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = decoded.userId;

    // GET - Get all addresses
    if (req.method === 'GET') {
      const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
      return res.status(200).json(addresses);
    }

    // POST - Create new address
    if (req.method === 'POST') {
      const addressData = req.body;

      // If this is the first address or marked as default, set it as default
      const existingCount = await Address.countDocuments({ userId });
      
      if (existingCount === 0 || addressData.isDefault) {
        // Remove default from all other addresses
        await Address.updateMany({ userId }, { isDefault: false });
        addressData.isDefault = true;
      }

      const address = new Address({
        ...addressData,
        userId
      });

      await address.save();
      return res.status(201).json(address);
    }

    // PUT - Update address
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = req.body;

      if (updates.isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
      }

      const address = await Address.findOneAndUpdate(
        { _id: id, userId },
        updates,
        { new: true }
      );

      if (!address) {
        return res.status(404).json({ error: 'Address not found' });
      }

      return res.status(200).json(address);
    }

    // DELETE - Remove address
    if (req.method === 'DELETE') {
      const { id } = req.query;

      const address = await Address.findOneAndDelete({ _id: id, userId });

      if (!address) {
        return res.status(404).json({ error: 'Address not found' });
      }

      // If deleted address was default, make another one default
      if (address.isDefault) {
        const firstAddress = await Address.findOne({ userId });
        if (firstAddress) {
          firstAddress.isDefault = true;
          await firstAddress.save();
        }
      }

      return res.status(200).json({ message: 'Address deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Address API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
