const mongoose = require('mongoose');
const jwt = require('jwt');

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

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  status: String,
  paymentStatus: String,
  items: Array,
  total: Number
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// Verify JWT token
function verifyToken(authHeader) {
  if (!authHeader) return null;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    return decoded;
  } catch {
    return null;
  }
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
  
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'PUT') {
    try {
      await connectToDatabase();

      const decoded = verifyToken(req.headers.authorization);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      // Find order and verify ownership
      const order = await Order.findOne({ _id: id, userId: decoded.userId });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if order can be cancelled
      if (order.status === 'delivered' || order.status === 'cancelled') {
        return res.status(400).json({ 
          error: `Cannot cancel ${order.status} order` 
        });
      }

      // Update order status
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      await order.save();

      // TODO: Initiate refund if payment was made
      if (order.paymentStatus === 'paid') {
        // Add refund logic here
        console.log(`Refund initiated for order: ${id}`);
      }

      return res.status(200).json({
        message: 'Order cancelled successfully',
        order: order
      });

    } catch (error) {
      console.error('Cancel order error:', error.message);
      return res.status(500).json({ 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
