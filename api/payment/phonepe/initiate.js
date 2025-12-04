const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jwt');

// Verify environment variables
function validateEnv() {
  const required = [
    'PHONEPE_MERCHANT_ID',
    'PHONEPE_SALT_KEY',
    'PHONEPE_SALT_INDEX',
    'JWT_SECRET',
    'FRONTEND_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

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

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total: { type: Number, required: true },
  paymentStatus: { type: String, default: 'pending' },
  merchantTransactionId: String
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

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
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

  if (req.method === 'POST') {
    try {
      // Validate environment variables
      validateEnv();

      // Verify authentication
      const decoded = verifyToken(req.headers.authorization);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await connectToDatabase();

      const { orderId, amount, customerPhone, customerEmail } = req.body;

      // Validate inputs
      if (!orderId || !amount || !customerPhone) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate amount (must be positive and reasonable)
      if (amount <= 0 || amount > 1000000) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Validate order exists and belongs to user
      const order = await Order.findOne({ _id: orderId, userId: decoded.userId });
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Verify amount matches order total
      if (Math.abs(order.total - amount) > 0.01) {
        return res.status(400).json({ error: 'Amount mismatch' });
      }

      // Validate phone number format
      const cleanPhone = customerPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      // Generate unique transaction ID with timestamp and random string
      const randomStr = crypto.randomBytes(8).toString('hex');
      const merchantTransactionId = `TXN_${orderId}_${Date.now()}_${randomStr}`;

      // Get PhonePe API URL based on environment
      const isProd = process.env.NODE_ENV === 'production';
      const PHONEPE_API_URL = isProd 
        ? 'https://api.phonepe.com/apis/hermes'
        : (process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox');

      // Prepare payment payload
      const paymentPayload = {
        merchantId: process.env.PHONEPE_MERCHANT_ID,
        merchantTransactionId: merchantTransactionId,
        merchantUserId: decoded.userId,
        amount: Math.round(amount * 100), // Convert to paise and ensure integer
        redirectUrl: `${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}&txnId=${merchantTransactionId}`,
        redirectMode: 'REDIRECT',
        callbackUrl: `${process.env.FRONTEND_URL}/api/payment/phonepe/callback`,
        mobileNumber: cleanPhone,
        paymentInstrument: {
          type: 'PAY_PAGE'
        }
      };

      // Encode payload to base64
      const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

      // Generate checksum with SHA256
      const checksumString = base64Payload + '/pg/v1/pay' + process.env.PHONEPE_SALT_KEY;
      const checksumHash = crypto.createHash('sha256').update(checksumString).digest('hex');
      const checksum = checksumHash + '###' + process.env.PHONEPE_SALT_INDEX;

      // Make API request to PhonePe with timeout
      const response = await axios.post(
        `${PHONEPE_API_URL}/pg/v1/pay`,
        {
          request: base64Payload
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data.success) {
        // Save transaction ID to order
        await Order.findByIdAndUpdate(orderId, {
          merchantTransactionId: merchantTransactionId,
          paymentStatus: 'initiated'
        });

        return res.status(200).json({
          success: true,
          redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
          merchantTransactionId: merchantTransactionId
        });
      } else {
        throw new Error(response.data.message || 'Payment initiation failed');
      }

    } catch (error) {
      console.error('PhonePe Payment Error:', error.message);
      
      // Log detailed error for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('Detailed error:', error);
      }
      
      return res.status(500).json({ 
        error: 'Failed to initiate payment',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
