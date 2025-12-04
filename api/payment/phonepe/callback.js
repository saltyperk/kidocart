const crypto = require('crypto');
const mongoose = require('mongoose');

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
  paymentStatus: String,
  transactionId: String,
  paymentMethod: String,
  merchantTransactionId: String,
  paidAt: Date
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  items: Array
});

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

module.exports = async (req, res) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'POST') {
    try {
      await connectToDatabase();

      // Verify environment variables
      if (!process.env.PHONEPE_SALT_KEY || !process.env.PHONEPE_SALT_INDEX) {
        throw new Error('PhonePe credentials not configured');
      }

      const { response } = req.body;
      
      if (!response) {
        return res.status(400).json({ error: 'Missing response data' });
      }

      // Decode base64 response
      let decodedResponse;
      try {
        const decodedString = Buffer.from(response, 'base64').toString('utf-8');
        decodedResponse = JSON.parse(decodedString);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid response format' });
      }

      // Verify checksum for security
      const receivedChecksum = req.headers['x-verify'];
      
      if (!receivedChecksum) {
        return res.status(400).json({ error: 'Missing checksum' });
      }

      const checksumString = response + process.env.PHONEPE_SALT_KEY;
      const calculatedChecksumHash = crypto.createHash('sha256').update(checksumString).digest('hex');
      const calculatedChecksum = calculatedChecksumHash + '###' + process.env.PHONEPE_SALT_INDEX;

      // Constant-time comparison to prevent timing attacks
      if (!crypto.timingSafeEqual(
        Buffer.from(receivedChecksum),
        Buffer.from(calculatedChecksum)
      )) {
        console.error('Checksum verification failed');
        return res.status(400).json({ error: 'Invalid checksum - potential tampering detected' });
      }

      // Extract transaction details
      const transactionId = decodedResponse.data?.merchantTransactionId;
      const paymentStatus = decodedResponse.code;
      const phonepeTransactionId = decodedResponse.data?.transactionId;

      if (!transactionId) {
        return res.status(400).json({ error: 'Missing transaction ID' });
      }

      // Extract order ID from transaction ID
      const parts = transactionId.split('_');
      if (parts.length < 2) {
        return res.status(400).json({ error: 'Invalid transaction ID format' });
      }
      
      const orderId = parts[1];

      // Validate order ID format
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      // Find order
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Verify transaction ID matches
      if (order.merchantTransactionId !== transactionId) {
        console.error('Transaction ID mismatch');
        return res.status(400).json({ error: 'Transaction ID mismatch' });
      }

      // Prevent duplicate processing
      if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
        console.log('Payment already processed for order:', orderId);
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      // Update order based on payment status
      const updateData = {
        transactionId: phonepeTransactionId || transactionId,
        merchantTransactionId: transactionId
      };

      if (paymentStatus === 'PAYMENT_SUCCESS') {
        updateData.paymentStatus = 'paid';
        updateData.paidAt = new Date();
        
        // Clear user's cart after successful payment
        if (order.userId) {
          await Cart.findOneAndUpdate(
            { userId: order.userId },
            { $set: { items: [] } }
          );
        }
      } else if (paymentStatus === 'PAYMENT_PENDING') {
        updateData.paymentStatus = 'pending';
      } else {
        updateData.paymentStatus = 'failed';
      }

      await Order.findByIdAndUpdate(orderId, updateData, { new: true });

      // Log for audit trail
      console.log(`Payment callback processed - Order: ${orderId}, Status: ${updateData.paymentStatus}, TxnID: ${phonepeTransactionId}`);

      return res.status(200).json({ 
        success: true,
        orderId: orderId,
        status: updateData.paymentStatus
      });

    } catch (error) {
      console.error('Callback Error:', error.message);
      
      return res.status(500).json({ 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
