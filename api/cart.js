// Vercel Serverless Function - Cart API
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

// Product Schema (needed for populate)
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  originalPrice: Number,
  category: String,
  ageGroup: String,
  brand: String,
  images: [String],
  stock: Number,
  availability: Boolean,
  rating: Number,
  reviewCount: Number,
  sizes: [String],
  colors: [String],
  badge: String,
  featured: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    size: String,
    color: String,
    addedAt: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now }
});

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();

    // Verify user
    const decoded = verifyToken(req.headers.authorization);
    if (!decoded) {
      return res.status(401).json({ error: 'Please login to access cart' });
    }

    const userId = decoded.userId;

    // GET CART
    if (req.method === 'GET') {
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      
      if (!cart) {
        return res.status(200).json({ items: [] });
      }
      
      return res.status(200).json(cart);
    }

    // ADD TO CART
    if (req.method === 'POST') {
      const { productId, quantity = 1, size, color } = req.body;

      let cart = await Cart.findOne({ userId });
      
      if (!cart) {
        // Create new cart
        cart = new Cart({
          userId,
          items: [{
            productId,
            quantity,
            size,
            color
          }]
        });
      } else {
        // Check if item already exists
        const existingItem = cart.items.find(item => 
          item.productId.toString() === productId &&
          item.size === size &&
          item.color === color
        );

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.items.push({
            productId,
            quantity,
            size,
            color
          });
        }
      }

      cart.updatedAt = new Date();
      await cart.save();
      
      const updatedCart = await Cart.findOne({ userId }).populate('items.productId');
      return res.status(200).json(updatedCart);
    }

    // UPDATE CART ITEM
    if (req.method === 'PUT') {
      const { productId, quantity, size, color } = req.body;

      const cart = await Cart.findOne({ userId });
      
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      const item = cart.items.find(item => 
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
      );

      if (!item) {
        return res.status(404).json({ error: 'Item not found in cart' });
      }

      if (quantity <= 0) {
        // Remove item
        cart.items = cart.items.filter(item => 
          !(item.productId.toString() === productId &&
            item.size === size &&
            item.color === color)
        );
      } else {
        item.quantity = quantity;
      }

      cart.updatedAt = new Date();
      await cart.save();
      
      const updatedCart = await Cart.findOne({ userId }).populate('items.productId');
      return res.status(200).json(updatedCart);
    }

    // DELETE FROM CART
    if (req.method === 'DELETE') {
      const { productId, size, color } = req.query;

      const cart = await Cart.findOne({ userId });
      
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      cart.items = cart.items.filter(item => 
        !(item.productId.toString() === productId &&
          item.size === size &&
          item.color === color)
      );

      cart.updatedAt = new Date();
      await cart.save();
      
      return res.status(200).json({ message: 'Item removed from cart' });
    }

    // CLEAR CART
    if (req.method === 'DELETE' && req.query.clear === 'true') {
      await Cart.findOneAndUpdate(
        { userId },
        { items: [], updatedAt: new Date() },
        { new: true }
      );
      
      return res.status(200).json({ message: 'Cart cleared' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Cart API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
