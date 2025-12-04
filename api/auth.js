const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

// Initialize Clients
const resend = new Resend(process.env.RESEND_API_KEY);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// MongoDB Connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = client;
  return cachedDb;
}

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: { type: String, select: true }, // Ensure password is selectable
  name: String,
  phone: String,
  authProvider: String,
  googleId: String,
  avatar: String
}, { strict: false });

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: { type: Date, expires: 300, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

// --- HELPER FUNCTIONS ---

async function handleLogin(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  
  if (!user) return res.status(400).json({ error: 'User not found' });
  if (user.authProvider === 'google') return res.status(400).json({ error: 'Please login with Google' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid password' });

  const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.status(200).json({ token, user });
}

async function handleSignup(req, res) {
  const { name, email, password, phone } = req.body;
  
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await User.create({
    name, email, phone, password: hashedPassword, authProvider: 'email'
  });

  const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.status(200).json({ token, user });
}

async function handleGoogle(req, res) {
  const { credential } = req.body;
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  const { email, name, picture, sub: googleId } = ticket.getPayload();

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, name, avatar: picture, googleId, authProvider: 'google' });
  }

  const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.status(200).json({ token, user });
}

async function handleSendOTP(req, res) {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  await OTP.deleteMany({ email });
  await OTP.create({ email, otp: hashedOTP });

  try {
    await resend.emails.send({
      from: 'KidoCart <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Login OTP',
      html: `<p>Your OTP is <strong>${otp}</strong>. Expires in 5 mins.</p>`
    });
    return res.status(200).json({ message: 'OTP Sent' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

async function handleVerifyOTP(req, res) {
  const { email, otp } = req.body;
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  
  const record = await OTP.findOne({ email });
  if (!record || record.otp !== hashedOTP) return res.status(400).json({ error: 'Invalid or expired OTP' });

  await OTP.deleteMany({ email }); // Clear OTP

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, name: email.split('@')[0], authProvider: 'email' });
  }

  const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.status(200).json({ token, user });
}

// --- MAIN HANDLER ---

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectToDatabase();
    
    // Check the 'type' query parameter to decide which function to run
    // Example URL: /api/auth?type=login
    const { type } = req.query;

    switch (type) {
      case 'login': return await handleLogin(req, res);
      case 'signup': return await handleSignup(req, res);
      case 'google': return await handleGoogle(req, res);
      case 'send-otp': return await handleSendOTP(req, res);
      case 'verify-otp': return await handleVerifyOTP(req, res);
      default: return res.status(400).json({ error: 'Invalid auth type' });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
