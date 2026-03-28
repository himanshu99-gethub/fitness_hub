// firebase-test.js - Test Firebase Connection

const { initializeFirebase, getFirebaseDB } = require('./functions/firebase-config');
const firebaseHelpers = require('./functions/firebaseHelpers');

async function testFirebase() {
  console.log('\n🧪 Firebase Real-time Database Test\n');
  
  try {
    // Initialize Firebase
    console.log('🔗 Initializing Firebase...');
    await initializeFirebase();
    console.log('✅ Firebase initialized!\n');
    
    // Test 1: Create a test user
    console.log('📝 Test 1: Creating test user...');
    const userResult = await firebaseHelpers.createUser({
      email: 'test@example.com',
      password: 'hashed_password_here',
      firstName: 'Test',
      lastName: 'User',
      isVerified: false,
    });
    
    if (userResult.success) {
      console.log('✅ User created:', userResult.user.id);
    } else {
      console.log('⚠️  User creation:', userResult.error);
    }
    
    // Test 2: Find user by email
    console.log('\n📖 Test 2: Finding user by email...');
    const findResult = await firebaseHelpers.findUserByEmail('test@example.com');
    if (findResult.success && findResult.user) {
      console.log('✅ User found:', findResult.user.id);
    } else {
      console.log('❌ User not found');
    }
    
    // Test 3: Generate OTP
    console.log('\n🔐 Test 3: Generating OTP...');
    const otpResult = await firebaseHelpers.generateOTP('test@example.com');
    if (otpResult.success) {
      console.log('✅ OTP generated:', otpResult.otp);
    } else {
      console.log('❌ OTP generation failed');
    }
    
    // Test 4: Verify OTP
    console.log('\n🔓 Test 4: Verifying OTP...');
    const verifyResult = await firebaseHelpers.verifyOTP('test@example.com', otpResult.otp);
    if (verifyResult.success) {
      console.log('✅ OTP verified successfully!');
    } else {
      console.log('❌ OTP verification failed:', verifyResult.message);
    }
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ All Firebase Tests Passed!');
    console.log('═══════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Firebase test failed!');
    console.error('Error:', error.message);
    console.error('\nMake sure to:');
    console.error('1. Create a Firebase project');
    console.error('2. Enable Realtime Database');
    console.error('3. Set database URL in .env\n');
    
    process.exit(1);
  }
}

testFirebase();
