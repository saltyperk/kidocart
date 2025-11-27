const mongoose = require('mongoose');

// MongoDB connection (reuse across function calls)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  cachedDb = connection;
  return cachedDb;
}

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  originalPrice: Number,
  category: String,
  ageGroup: String,
  brand: String,
  images: [String],
  stock: { type: Number, default: 0 },
  availability: { type: Boolean, default: true },
  rating: { type: Number, default: 4.5 },
  reviewCount: { type: Number, default: 0 },
  sizes: [String],
  colors: [String],
  badge: String,
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Prevent model overwrite error
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    await connectToDatabase();
    
    const path = event.path.replace('/.netlify/functions/products', '').replace('/api/products', '');
    const id = path.split('/')[1];
    
    // GET all products or single product
    if (event.httpMethod === 'GET') {
      if (id) {
        const product = await Product.findById(id);
        if (!product) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Product not found' })
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(product)
        };
      } else {
        // Get all products with optional filters
        const params = event.queryStringParameters || {};
        let query = {};
        
        if (params.category) query.category = params.category;
        if (params.ageGroup) query.ageGroup = params.ageGroup;
        if (params.brand) query.brand = params.brand;
        if (params.featured) query.featured = params.featured === 'true';
        if (params.availability) query.availability = params.availability === 'true';
        
        const products = await Product.find(query).sort({ createdAt: -1 });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(products)
        };
      }
    }
    
    // POST - Create new product
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const product = new Product(data);
      await product.save();
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(product)
      };
    }
    
    // PUT - Update product
    if (event.httpMethod === 'PUT' && id) {
      const data = JSON.parse(event.body);
      const product = await Product.findByIdAndUpdate(id, data, { new: true });
      if (!product) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Product not found' })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(product)
      };
    }
    
    // DELETE - Remove product
    if (event.httpMethod === 'DELETE' && id) {
      const product = await Product.findByIdAndDelete(id);
      if (!product) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Product not found' })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Product deleted successfully' })
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
