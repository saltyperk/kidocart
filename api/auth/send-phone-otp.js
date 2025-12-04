/*const mongoose = require('mongoose');
const crypto = require('crypto');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = client;
  return cachedDb;
}

// OTP Schema for Phone
const phoneOTPSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }
});

const PhoneOTP = mongoose.models.PhoneOTP || mongoose.model('PhoneOTP', phoneOTPSchema);

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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      await connectToDatabase();

      const { phone } = req.body;

      // Validate phone number (Indian format)
      const phoneRegex = /^[6-9]\d{9}$/;
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      // Rate limiting
      const recentOTP = await PhoneOTP.findOne({
        phone: cleanPhone,
        createdAt: { $gte: new Date(Date.now() - 60000) }
      });

      if (recentOTP) {
        return res.status(429).json({ 
          error: 'Please wait 1 minute before requesting another OTP' 
        });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Hash OTP
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

      // Delete old OTPs
      await PhoneOTP.deleteMany({ phone: cleanPhone });

      // Store new OTP
      await PhoneOTP.create({
        phone: cleanPhone,
        otp: hashedOTP
      });

      // TODO: Send SMS using your SMS provider
      // For now, return OTP in development mode (REMOVE IN PRODUCTION)
      console.log(`Phone OTP for ${cleanPhone}: ${otp}`);

      return res.status(200).json({ 
        success: true,
        message: 'OTP sent to your phone',
        ...(process.env.NODE_ENV === 'development' && { otp: otp }) // REMOVE IN PRODUCTION
      });

    } catch (error) {
      console.error('Send Phone OTP Error:', error);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
*/
