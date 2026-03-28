// firebaseHelpers.js - Firebase Database Helper Functions
const { getFirebaseDB } = require('./firebase-config');

// ==================== USER OPERATIONS ====================

// Create a new user
async function createUser(userData) {
  try {
    const db = getFirebaseDB();
    const usersRef = db.ref('users');
    
    // Check if email already exists
    const snapshot = await usersRef.orderByChild('email').equalTo(userData.email).once('value');
    if (snapshot.exists()) {
      return { success: false, error: 'Email already exists' };
    }
    
    // Create new user with auto-generated ID
    const newUserRef = usersRef.push();
    await newUserRef.set({
      ...userData,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
    
    return { success: true, user: { id: newUserRef.key, ...userData } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Find user by email
async function findUserByEmail(email) {
  try {
    const db = getFirebaseDB();
    const snapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    
    if (!snapshot.exists()) {
      return { success: true, user: null };
    }
    
    const users = snapshot.val();
    const userId = Object.keys(users)[0];
    
    return { success: true, user: { id: userId, ...users[userId] } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Find user by ID
async function findUserById(userId) {
  try {
    const db = getFirebaseDB();
    const snapshot = await db.ref(`users/${userId}`).once('value');
    
    if (!snapshot.exists()) {
      return { success: true, user: null };
    }
    
    return { success: true, user: { id: userId, ...snapshot.val() } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update user profile
async function updateUserProfile(userId, updateData) {
  try {
    const db = getFirebaseDB();
    await db.ref(`users/${userId}`).update({
      ...updateData,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
    
    const snapshot = await db.ref(`users/${userId}`).once('value');
    return { success: true, user: { id: userId, ...snapshot.val() } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== MEMBERSHIP OPERATIONS ====================

// Create a new membership
async function createMembership(membershipData) {
  try {
    const db = getFirebaseDB();
    const membershipsRef = db.ref('memberships');
    
    const newMembershipRef = membershipsRef.push();
    await newMembershipRef.set({
      ...membershipData,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
    
    // Update user membership status
    await db.ref(`users/${membershipData.userId}`).update({
      membershipStatus: 'active',
    });
    
    return { success: true, membership: { id: newMembershipRef.key, ...membershipData } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user's active membership
async function getUserActiveMembership(userId) {
  try {
    const db = getFirebaseDB();
    const snapshot = await db.ref('memberships')
      .orderByChild('userId')
      .equalTo(userId)
      .once('value');
    
    if (!snapshot.exists()) {
      return { success: true, membership: null };
    }
    
    const memberships = snapshot.val();
    
    for (const [id, membership] of Object.entries(memberships)) {
      if (membership.status === 'active' && membership.endDate > Date.now()) {
        return { success: true, membership: { id, ...membership } };
      }
    }
    
    return { success: true, membership: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get all user memberships
async function getUserMemberships(userId) {
  try {
    const db = getFirebaseDB();
    const snapshot = await db.ref('memberships')
      .orderByChild('userId')
      .equalTo(userId)
      .once('value');
    
    if (!snapshot.exists()) {
      return { success: true, memberships: [] };
    }
    
    const memberships = [];
    snapshot.forEach((child) => {
      memberships.push({ id: child.key, ...child.val() });
    });
    
    return { success: true, memberships };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== PAYMENT OPERATIONS ====================

// Create a new payment record
async function createPayment(paymentData) {
  try {
    const db = getFirebaseDB();
    const paymentsRef = db.ref('payments');
    
    const newPaymentRef = paymentsRef.push();
    await newPaymentRef.set({
      ...paymentData,
      paymentDate: admin.database.ServerValue.TIMESTAMP,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
    
    return { success: true, payment: { id: newPaymentRef.key, ...paymentData } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user's payment history
async function getUserPayments(userId) {
  try {
    const db = getFirebaseDB();
    const snapshot = await db.ref('payments')
      .orderByChild('userId')
      .equalTo(userId)
      .once('value');
    
    if (!snapshot.exists()) {
      return { success: true, payments: [] };
    }
    
    const payments = [];
    snapshot.forEach((child) => {
      payments.push({ id: child.key, ...child.val() });
    });
    
    // Sort by payment date (newest first)
    payments.sort((a, b) => (b.paymentDate || 0) - (a.paymentDate || 0));
    
    return { success: true, payments };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get payment by transaction ID
async function getPaymentByTransactionId(transactionId) {
  try {
    const db = getFirebaseDB();
    const snapshot = await db.ref('payments')
      .orderByChild('transactionId')
      .equalTo(transactionId)
      .once('value');
    
    if (!snapshot.exists()) {
      return { success: true, payment: null };
    }
    
    const payments = snapshot.val();
    const paymentId = Object.keys(payments)[0];
    
    return { success: true, payment: { id: paymentId, ...payments[paymentId] } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update payment status
async function updatePaymentStatus(paymentId, status) {
  try {
    const db = getFirebaseDB();
    await db.ref(`payments/${paymentId}`).update({
      status,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
    
    const snapshot = await db.ref(`payments/${paymentId}`).once('value');
    return { success: true, payment: { id: paymentId, ...snapshot.val() } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== OTP OPERATIONS ====================

// Generate and save OTP
async function generateOTP(email) {
  try {
    const db = getFirebaseDB();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    const otpRef = db.ref(`otps/${email.toLowerCase()}`);
    await otpRef.set({
      email: email.toLowerCase(),
      otp,
      attempts: 0,
      verified: false,
      expiresAt,
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });
    
    return { success: true, otp };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify OTP
async function verifyOTP(email, otp) {
  try {
    const db = getFirebaseDB();
    const snapshot = await db.ref(`otps/${email.toLowerCase()}`).once('value');
    
    if (!snapshot.exists()) {
      return { success: false, message: 'OTP not found' };
    }
    
    const otpRecord = snapshot.val();
    
    if (Date.now() > otpRecord.expiresAt) {
      await db.ref(`otps/${email.toLowerCase()}`).remove();
      return { success: false, message: 'OTP has expired' };
    }
    
    if (otpRecord.attempts >= 5) {
      await db.ref(`otps/${email.toLowerCase()}`).remove();
      return { success: false, message: 'Too many attempts. Request new OTP.' };
    }
    
    if (otpRecord.otp !== otp) {
      await db.ref(`otps/${email.toLowerCase()}`).update({
        attempts: otpRecord.attempts + 1,
      });
      return { success: false, message: 'Invalid OTP' };
    }
    
    await db.ref(`otps/${email.toLowerCase()}`).update({
      verified: true,
    });
    
    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Clean expired OTPs
async function cleanExpiredOTPs() {
  try {
    const db = getFirebaseDB();
    const snapshot = await db.ref('otps').once('value');
    
    if (!snapshot.exists()) {
      return { success: true, deletedCount: 0 };
    }
    
    let deletedCount = 0;
    snapshot.forEach((child) => {
      const otpRecord = child.val();
      if (Date.now() > otpRecord.expiresAt) {
        db.ref(`otps/${child.key}`).remove();
        deletedCount++;
      }
    });
    
    return { success: true, deletedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const admin = require('firebase-admin');

module.exports = {
  // User operations
  createUser,
  findUserByEmail,
  findUserById,
  updateUserProfile,
  // Membership operations
  createMembership,
  getUserActiveMembership,
  getUserMemberships,
  // Payment operations
  createPayment,
  getUserPayments,
  getPaymentByTransactionId,
  updatePaymentStatus,
  // OTP operations
  generateOTP,
  verifyOTP,
  cleanExpiredOTPs,
};
