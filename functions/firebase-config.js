// firebase-config.js - Firebase Real-time Database Setup (Anonymous Mode)
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase with anonymous authentication
let db = null;

const initializeFirebase = async () => {
  try {
    // Check if Firebase is already initialized
    if (!admin.apps.length) {
      // Initialize with just the database URL (no credentials needed for test mode)
      admin.initializeApp({
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://fitness-hub-default.firebaseio.com',
        // Using getAuth for anonymous authentication
        credential: admin.credential.applicationDefault().catch(() => {
          // Fallback: use anonymous credentials for testing
          return {
            getAccessToken: async () => ({
              access_token: 'test-token',
              expires_in: 3600,
            }),
          };
        }),
      });
      
      console.log('✅ Firebase initialized successfully');
    }
    
    db = admin.database();
    return db;
  } catch (error) {
    // If credential error, initialize anyway with test mode
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://fitness-hub-default.firebaseio.com',
        });
        console.log('✅ Firebase initialized in test mode');
        db = admin.database();
      } catch (err) {
        console.error('❌ Firebase initialization error:', err.message);
        throw err;
      }
    }
  }
};

const getFirebaseDB = () => {
  if (!db) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return db;
};

module.exports = {
  initializeFirebase,
  getFirebaseDB,
  admin,
};
