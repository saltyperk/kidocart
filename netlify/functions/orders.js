const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const connection = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = connection;
  return cachedDb;
}

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    productId: String,
    name: String,
    price: Number,
    quantity: Number,
    size: String,
    color: String,
    image: String
  }],
  subtotal: Number,
  shipping: Number,
  tax: Number,
  total: Number,
  shippingAddress: {
    firstName: String,
    lastName: String,
    phone: String,
    address: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  paymentMethod: String,
  paymentId: String,
  paymentStatus: { type: String, default: 'pending' },
  status: { type: String, default: 'confirmed' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

// Verify JWT token
function verifyToken(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectToDatabase();
    
    const path = event.path.replace('/.netlify/functions/orders', '').replace('/api/orders', '');
    const pathParts = path.split('/').filter(Boolean);
    
    // GET all orders (Admin) or user orders
    if (event.httpMethod === 'GET') {
      const decoded = verifyToken(event.headers.authorization);
      
      // Check if admin request (has admin query param)
      const isAdmin = event.queryStringParameters?.admin === 'true';
      
      if (isAdmin) {
        // Return all orders for admin
        const orders = await Order.find()
          .populate('userId', 'name email')
          .sort({ createdAt: -1 });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(orders)
        };
      }
      
      if (!decoded) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }
      
      // Single order
      if (pathParts[0]) {
        const order = await Order.findOne({ 
          orderId: pathParts[0],
          userId: decoded.userId 
        });
        return {
          statusCode: order ? 200 : 404,
          headers,
          body: JSON.stringify(order || { error: 'Order not found' })
        };
      }
      
      // All user orders
      const orders = await Order.find({ userId: decoded.userId })
        .sort({ createdAt: -1 });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(orders)
      };
    }
    
    // POST - Create new order
    if (event.httpMethod === 'POST') {
      const decoded = verifyToken(event.headers.authorization);
      if (!decoded) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }
      
      const orderData = JSON.parse(event.body);
      
      // Generate order ID
      const orderId = 'ORD-' + Date.now();
      
      const order = new Order({
        ...orderData,
        orderId,
        userId: decoded.userId
      });
      
      await order.save();
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(order)
      };
    }
    
    // PUT - Update order status (Admin)
    if (event.httpMethod === 'PUT' && pathParts[0]) {
      const updates = JSON.parse(event.body);
      
      const order = await Order.findOneAndUpdate(
        { orderId: pathParts[0] },
        { 
          ...updates,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!order) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Order not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(order)
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
