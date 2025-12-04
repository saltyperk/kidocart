// Vercel Serverless Function - Wishlist API
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

// Product Schema (needed for populate to work)
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  originalPrice: Number,
  images: [String],
  category: String,
  brand: String,
  rating: Number,
  reviewCount: Number,
  availability: Boolean,
  stock: Number
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Wishlist Schema
const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    addedAt: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now }
});

const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();

    // Verify user
    const decoded = verifyToken(req.headers.authorization);
    if (!decoded) {
      return res.status(401).json({ error: 'Please login to access wishlist' });
    }

    const userId = decoded.userId;

    // GET WISHLIST
    if (req.method === 'GET') {
      const wishlist = await Wishlist.findOne({ userId }).populate('items.productId');
      
      if (!wishlist) {
        return res.status(200).json({ items: [] });
      }
      
      return res.status(200).json(wishlist);
    }

    // ADD TO WISHLIST
    if (req.method === 'POST') {
      const { productId } = req.body;

      let wishlist = await Wishlist.findOne({ userId });
      
      if (!wishlist) {
        // Create new wishlist
        wishlist = new Wishlist({
          userId,
          items: [{ productId }]
        });
      } else {
        // Check if already in wishlist
        const exists = wishlist.items.some(item => 
          item.productId.toString() === productId
        );

        if (!exists) {
          wishlist.items.push({ productId });
        }
      }

      wishlist.updatedAt = new Date();
      await wishlist.save();
      
      const updatedWishlist = await Wishlist.findOne({ userId }).populate('items.productId');
      return res.status(200).json(updatedWishlist);
    }

    // TOGGLE WISHLIST (Add/Remove)
    if (req.method === 'POST' && req.query.toggle === 'true') {
      const { productId } = req.body;

      let wishlist = await Wishlist.findOne({ userId });
      
      if (!wishlist) {
        // Create new wishlist with item
        wishlist = new Wishlist({
          userId,
          items: [{ productId }]
        });
        await wishlist.save();
        return res.status(200).json({ added: true, wishlist });
      }

      // Check if exists
      const index = wishlist.items.findIndex(item => 
        item.productId.toString() === productId
      );

      if (index > -1) {
        // Remove from wishlist
        wishlist.items.splice(index, 1);
        await wishlist.save();
        return res.status(200).json({ added: false, wishlist });
      } else {
        // Add to wishlist
        wishlist.items.push({ productId });
        await wishlist.save();
        return res.status(200).json({ added: true, wishlist });
      }
    }

    // REMOVE FROM WISHLIST
    if (req.method === 'DELETE') {
      const { productId } = req.query;

      const wishlist = await Wishlist.findOne({ userId });
      
      if (!wishlist) {
        return res.status(404).json({ error: 'Wishlist not found' });
      }

      wishlist.items = wishlist.items.filter(item => 
        item.productId.toString() !== productId
      );

      wishlist.updatedAt = new Date();
      await wishlist.save();
      
      return res.status(200).json({ message: 'Item removed from wishlist' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Wishlist API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
