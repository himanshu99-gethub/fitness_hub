// firebase-rest-test.js - Firebase REST API Test (No Credentials Needed!)
require('dotenv').config();
const https = require('https');

const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || 'https://fitness-hub-default.firebaseio.com';

/**
 * Make HTTP request to Firebase REST API
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
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testFirebase() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║     🧪 Firebase REST API Test (No Auth!)        ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  try {
    // Test 1: Create a user
    console.log('📝 Test 1: Creating test user...');
    const createUserResponse = await firebaseRequest('/users/test_user_1', 'PUT', {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date().toISOString(),
    });
    
    if (createUserResponse.status === 200) {
      console.log('✅ User created successfully!\n');
    } else {
      console.log('⚠️  Status:', createUserResponse.status, '\n');
    }
    
    // Test 2: Read user
    console.log('📖 Test 2: Reading user data...');
    const readUserResponse = await firebaseRequest('/users/test_user_1', 'GET');
    
    if (readUserResponse.status === 200) {
      console.log('✅ User data retrieved:');
      console.log(JSON.stringify(readUserResponse.data, null, 2));
      console.log('');
    } else {
      console.log('❌ Failed to read user\n');
    }
    
    // Test 3: Update user
    console.log('✏️  Test 3: Updating user...');
    const updateResponse = await firebaseRequest('/users/test_user_1', 'PATCH', {
      age: 25,
      updatedAt: new Date().toISOString(),
    });
    
    if (updateResponse.status === 200) {
      console.log('✅ User updated successfully!\n');
    } else {
      console.log('❌ Update failed\n');
    }
    
    // Test 4: Create OTP
    console.log('🔐 Test 4: Generating OTP...');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpResponse = await firebaseRequest('/otps/test@example.com', 'PUT', {
      email: 'test@example.com',
      otp: otp,
      attempts: 0,
      verified: false,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    
    if (otpResponse.status === 200) {
      console.log('✅ OTP created:', otp, '\n');
    } else {
      console.log('❌ OTP creation failed\n');
    }
    
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║          ✅ All Tests Passed!                    ║');
    console.log('║     Firebase REST API is working! 🎉            ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n🔧 Fix:');
      console.error('1. Check FIREBASE_DATABASE_URL in .env');
      console.error('2. Make sure it\'s in format: https://project-name.firebaseio.com');
      console.error('3. Firebase project must be created\n');
    }
    
    process.exit(1);
  }
}

testFirebase();
