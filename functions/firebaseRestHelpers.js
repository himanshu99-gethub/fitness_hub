// functions/firebaseRestHelpers.js - Firebase REST API Helpers (No Credentials)
const https = require('https');
const { URL } = require('url');

const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || 'https://fitness-hub-default.firebaseio.com';

/**
 * Make HTTPS request to Firebase REST API
 */
function firebaseRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${FIREBASE_DB_URL}${path}.json`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Firebase API error: ${res.statusCode} - ${parsed?.error || data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// ============ USER FUNCTIONS ============

/**
 * Create a new user
 */
async function createUser(userData) {
  const { email, firstName, lastName, phone, password, role = 'user' } = userData;
  
  if (!email) throw new Error('Email is required');
  
  const user = {
    email,
    firstName,
    lastName,
    phone,
    password, // In production, hash this!
    role,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  
  const userId = email.replace(/[.@]/g, '_');
  await firebaseRequest(`/users/${userId}`, 'PUT', user);
  
  return { userId, ...user };
}

/**
 * Find user by email
 */
async function findUserByEmail(email) {
  const userId = email.replace(/[.@]/g, '_');
  const user = await firebaseRequest(`/users/${userId}`, 'GET');
  
  if (user) {
    return { userId, ...user };
  }
  return null;
}

/**
 * Get all users
 */
async function getAllUsers() {
  const users = await firebaseRequest('/users', 'GET');
  
  if (users) {
    return Object.entries(users).map(([userId, data]) => ({ userId, ...data }));
  }
  return [];
}

/**
 * Update user
 */
async function updateUser(email, updateData) {
  const userId = email.replace(/[.@]/g, '_');
  updateData.updatedAt = new Date().toISOString();
  
  await firebaseRequest(`/users/${userId}`, 'PATCH', updateData);
  
  return { userId, ...updateData };
}

/**
 * Delete user
 */
async function deleteUser(email) {
  const userId = email.replace(/[.@]/g, '_');
  await firebaseRequest(`/users/${userId}`, 'DELETE');
  
  return { success: true, userId };
}

// ============ MEMBERSHIP FUNCTIONS ============

/**
 * Create membership
 */
async function createMembership(membershipData) {
  const { userId, email, plan, startDate, endDate, price, paymentStatus = 'pending' } = membershipData;
  
  if (!email || !plan) throw new Error('Email and plan are required');
  
  const membership = {
    userId,
    email,
    plan,
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    price,
    paymentStatus,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  const membershipId = `${email.replace(/[.@]/g, '_')}_${Date.now()}`;
  await firebaseRequest(`/memberships/${membershipId}`, 'PUT', membership);
  
  return { membershipId, ...membership };
}

/**
 * Get user's active membership
 */
async function getUserActiveMembership(email) {
  const allMemberships = await firebaseRequest('/memberships', 'GET');
  
  if (!allMemberships) return null;
  
  const userEmail = email.replace(/[.@]/g, '_');
  
  for (const [membershipId, membership] of Object.entries(allMemberships)) {
    if (membership.email === email && membership.isActive) {
      const endDate = new Date(membership.endDate);
      if (endDate > new Date()) {
        return { membershipId, ...membership };
      }
    }
  }
  
  return null;
}

/**
 * Get all memberships for user
 */
async function getUserMemberships(email) {
  const allMemberships = await firebaseRequest('/memberships', 'GET');
  
  if (!allMemberships) return [];
  
  return Object.entries(allMemberships)
    .filter(([_, membership]) => membership.email === email)
    .map(([membershipId, membership]) => ({ membershipId, ...membership }));
}

/**
 * Update membership status
 */
async function updateMembershipStatus(membershipId, status) {
  const membership = await firebaseRequest(`/memberships/${membershipId}`, 'GET');
  
  if (!membership) throw new Error('Membership not found');
  
  const updateData = {
    paymentStatus: status,
    updatedAt: new Date().toISOString(),
  };
  
  if (status === 'paid') {
    updateData.isActive = true;
  }
  
  await firebaseRequest(`/memberships/${membershipId}`, 'PATCH', updateData);
  
  return { membershipId, ...updateData };
}

// ============ OTP FUNCTIONS ============

/**
 * Generate OTP
 */
async function generateOTP(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  const otpData = {
    email,
    otp,
    attempts: 0,
    verified: false,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  
  const emailKey = email.replace(/[.@]/g, '_');
  await firebaseRequest(`/otps/${emailKey}`, 'PUT', otpData);
  
  return { otp, email, expiresIn: '10 minutes' };
}

/**
 * Verify OTP
 */
async function verifyOTP(email, otp) {
  const emailKey = email.replace(/[.@]/g, '_');
  const otpData = await firebaseRequest(`/otps/${emailKey}`, 'GET');
  
  if (!otpData) {
    return { verified: false, message: 'OTP not found' };
  }
  
  if (otpData.verified) {
    return { verified: false, message: 'OTP already verified' };
  }
  
  if (Date.now() > otpData.expiresAt) {
    return { verified: false, message: 'OTP expired' };
  }
  
  if (otpData.attempts >= 3) {
    return { verified: false, message: 'Too many attempts. OTP expired.' };
  }
  
  if (otpData.otp !== otp) {
    const newAttempts = otpData.attempts + 1;
    await firebaseRequest(`/otps/${emailKey}`, 'PATCH', { attempts: newAttempts });
    return { verified: false, message: `Invalid OTP. Attempts: ${newAttempts}/3` };
  }
  
  // OTP is correct
  await firebaseRequest(`/otps/${emailKey}`, 'PATCH', { verified: true, verifiedAt: new Date().toISOString() });
  
  return { verified: true, message: 'OTP verified successfully' };
}

/**
 * Clean expired OTPs
 */
async function cleanExpiredOTPs() {
  const allOTPs = await firebaseRequest('/otps', 'GET');
  
  if (!allOTPs) return { deleted: 0 };
  
  let deletedCount = 0;
  const now = Date.now();
  
  for (const [emailKey, otpData] of Object.entries(allOTPs)) {
    if (now > otpData.expiresAt) {
      await firebaseRequest(`/otps/${emailKey}`, 'DELETE');
      deletedCount++;
    }
  }
  
  return { deleted: deletedCount };
}

// ============ PAYMENT FUNCTIONS ============

/**
 * Create payment record
 */
async function createPayment(paymentData) {
  const { email, membershipId, amount, method, transactionId } = paymentData;
  
  if (!email || !amount) throw new Error('Email and amount are required');
  
  const payment = {
    email,
    membershipId,
    amount,
    method,
    transactionId,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  
  const paymentId = `${email.replace(/[.@]/g, '_')}_${Date.now()}`;
  await firebaseRequest(`/payments/${paymentId}`, 'PUT', payment);
  
  return { paymentId, ...payment };
}

/**
 * Get payment history for user
 */
async function getPaymentHistory(email) {
  const allPayments = await firebaseRequest('/payments', 'GET');
  
  if (!allPayments) return [];
  
  return Object.entries(allPayments)
    .filter(([_, payment]) => payment.email === email)
    .map(([paymentId, payment]) => ({ paymentId, ...payment }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get total revenue
 */
async function getTotalRevenue() {
  const allPayments = await firebaseRequest('/payments', 'GET');
  
  if (!allPayments) return 0;
  
  return Object.values(allPayments)
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
}

// ============ EXPORTS ============

module.exports = {
  // User functions
  createUser,
  findUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser,
  
  // Membership functions
  createMembership,
  getUserActiveMembership,
  getUserMemberships,
  updateMembershipStatus,
  
  // OTP functions
  generateOTP,
  verifyOTP,
  cleanExpiredOTPs,
  
  // Payment functions
  createPayment,
  getPaymentHistory,
  getTotalRevenue,
};
