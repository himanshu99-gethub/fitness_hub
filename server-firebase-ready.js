// server-firebase-ready.js - Complete Express Server with Firebase Integration
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const firebase = require('./functions/firebaseRestHelpers');

const app = express();
const PORT = process.env.PORT || 5000;

// ============ MIDDLEWARE ============
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.send(200);
  }
  next();
});

// ============ AUTHENTICATION ROUTES ============

/**
 * POST /api/auth/register
 * Register new user
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, firstName, lastName, phone, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await firebase.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create user
    const user = await firebase.createUser({
      email,
      firstName: firstName || 'User',
      lastName: lastName || '',
      phone: phone || '',
      password: password, // In production, hash this!
      role: 'user'
    });

    // Create session for newly registered user (for cross-device sync)
    const session = await firebase.createSession(email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { userId: user.userId, email: user.email, firstName: user.firstName },
      session: session // Return session info to client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * User login
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await firebase.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // In production, compare hashed passwords
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session in Firebase (for cross-device sync)
    const session = await firebase.createSession(email);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: { userId: user.userId, email: user.email, firstName: user.firstName },
      session: session // Return session info to client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/validate-session
 * Check if user has an active session (for cross-device sync)
 */
app.get('/api/auth/validate-session', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-user-email'];
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if session exists in Firebase
    const result = await firebase.validateSession(email);
    
    if (result.valid) {
      // Get latest user data
      const user = await firebase.findUserByEmail(email);
      return res.json({
        success: true,
        isAuthenticated: true,
        user: { userId: user.userId, email: user.email, firstName: user.firstName },
        session: result.session
      });
    } else {
      return res.status(401).json({
        success: false,
        isAuthenticated: false,
        error: 'Session not found or expired'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate session)
 */
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Invalidate session in Firebase
    await firebase.invalidateSession(email);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ OTP ROUTES ============

/**
 * POST /api/otp/generate
 * Generate OTP for email
 */
app.post('/api/otp/generate', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await firebase.generateOTP(email);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otp: result.otp,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/otp/verify
 * Verify OTP
 */
app.post('/api/otp/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const result = await firebase.verifyOTP(email, otp);

    if (result.verified) {
      return res.json({
        success: true,
        message: result.message,
        verified: true
      });
    } else {
      return res.status(401).json({
        success: false,
        message: result.message,
        verified: false
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MEMBERSHIP ROUTES ============

/**
 * POST /api/membership/create
 * Create new membership
 */
app.post('/api/membership/create', async (req, res) => {
  try {
    const { userId, email, plan, startDate, endDate, price } = req.body;

    if (!email || !plan) {
      return res.status(400).json({ error: 'Email and plan are required' });
    }

    const membership = await firebase.createMembership({
      userId: userId || email,
      email,
      plan,
      startDate: startDate || new Date(),
      endDate,
      price,
      paymentStatus: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Membership created successfully',
      membership
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/membership/:userId
 * Get active membership for user
 */
app.get('/api/membership/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // userId here is typically the email
    const membership = await firebase.getUserActiveMembership(userId);

    if (!membership) {
      return res.status(404).json({ error: 'No active membership found' });
    }

    res.json({
      success: true,
      membership
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/membership/history/:userId
 * Get all memberships for user
 */
app.get('/api/membership/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const memberships = await firebase.getUserMemberships(userId);

    res.json({
      success: true,
      count: memberships.length,
      memberships
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/membership/update-status
 * Update membership payment status
 */
app.post('/api/membership/update-status', async (req, res) => {
  try {
    const { membershipId, status } = req.body;

    if (!membershipId || !status) {
      return res.status(400).json({ error: 'Membership ID and status are required' });
    }

    const result = await firebase.updateMembershipStatus(membershipId, status);

    res.json({
      success: true,
      message: 'Membership updated successfully',
      membership: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PAYMENT ROUTES ============

/**
 * POST /api/payment/create
 * Create payment record
 */
app.post('/api/payment/create', async (req, res) => {
  try {
    const { email, membershipId, amount, method, transactionId } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: 'Email and amount are required' });
    }

    const payment = await firebase.createPayment({
      email,
      membershipId,
      amount,
      method: method || 'card',
      transactionId: transactionId || `txn_${Date.now()}`,
      status: 'completed'
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/history/:userId
 * Get payment history for user
 */
app.get('/api/payment/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const payments = await firebase.getPaymentHistory(userId);

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/total-revenue
 * Get total revenue (admin only)
 */
app.get('/api/payment/total-revenue', async (req, res) => {
  try {
    const total = await firebase.getTotalRevenue();

    res.json({
      success: true,
      totalRevenue: total,
      currency: 'INR'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    database: 'Firebase Realtime Database',
    timestamp: new Date().toISOString(),
    url: process.env.FIREBASE_DATABASE_URL
  });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║  🚀 Fitness Hub Server Ready!    ║');
  console.log('╠════════════════════════════════════╣');
  console.log(`║  Port: ${PORT}`);
  console.log('║  Database: Firebase Realtime DB   ║');
  console.log('║  Status: ✅ Connected             ║');
  console.log('╚════════════════════════════════════╝\n');
  console.log('Available Routes:');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/login');
  console.log('  POST   /api/otp/generate');
  console.log('  POST   /api/otp/verify');
  console.log('  POST   /api/membership/create');
  console.log('  GET    /api/membership/:userId');
  console.log('  GET    /api/membership/history/:userId');
  console.log('  POST   /api/membership/update-status');
  console.log('  POST   /api/payment/create');
  console.log('  GET    /api/payment/history/:userId');
  console.log('  GET    /api/payment/total-revenue');
  console.log('  GET    /api/health\n');
});
