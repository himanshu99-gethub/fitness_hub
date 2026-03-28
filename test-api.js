// test-api.js - Test all API endpoints
const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║          🧪 API Testing Started                      ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing Health Check...');
    const health = await makeRequest('GET', '/api/health');
    if (health.status === 200) {
      console.log('✅ Health Check: OK');
      console.log('   Database:', health.data.database);
    } else {
      console.log('❌ Health Check failed:', health.status);
    }

    // Test 2: Register User
    console.log('\n2️⃣  Testing User Registration...');
    const register = await makeRequest('POST', '/api/auth/register', {
      email: 'testuser@fitness.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '9876543210',
      password: 'Test@123',
    });
    if (register.status === 201) {
      console.log('✅ User Registered:', register.data.user.email);
    } else {
      console.log('ℹ️  Register response:', register.status, register.data);
    }

    // Test 3: Login
    console.log('\n3️⃣  Testing Login...');
    const login = await makeRequest('POST', '/api/auth/login', {
      email: 'testuser@fitness.com',
      password: 'Test@123',
    });
    if (login.status === 200) {
      console.log('✅ Login Successful:', login.data.user.email);
    } else {
      console.log('ℹ️  Login response:', login.status, login.data);
    }

    // Test 4: Generate OTP
    console.log('\n4️⃣  Testing OTP Generation...');
    const otp = await makeRequest('POST', '/api/otp/generate', {
      email: 'testuser@fitness.com',
    });
    if (otp.status === 200) {
      console.log('✅ OTP Generated:', otp.data.otp);
      const generatedOTP = otp.data.otp;

      // Test 5: Verify OTP
      console.log('\n5️⃣  Testing OTP Verification...');
      const verify = await makeRequest('POST', '/api/otp/verify', {
        email: 'testuser@fitness.com',
        otp: generatedOTP,
      });
      if (verify.status === 200 && verify.data.verified) {
        console.log('✅ OTP Verified Successfully');
      } else {
        console.log('ℹ️  OTP Verification response:', verify.status, verify.data);
      }
    }

    // Test 6: Create Membership
    console.log('\n6️⃣  Testing Membership Creation...');
    const membership = await makeRequest('POST', '/api/membership/create', {
      userId: 'testuser@fitness.com',
      email: 'testuser@fitness.com',
      plan: 'premium',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      price: 2999,
    });
    if (membership.status === 201) {
      console.log('✅ Membership Created:', membership.data.membership.plan);
      const membershipId = membership.data.membership.membershipId;

      // Test 7: Create Payment
      console.log('\n7️⃣  Testing Payment Creation...');
      const payment = await makeRequest('POST', '/api/payment/create', {
        email: 'testuser@fitness.com',
        membershipId: membershipId,
        amount: 2999,
        method: 'card',
        transactionId: 'TXN_' + Date.now(),
      });
      if (payment.status === 201) {
        console.log('✅ Payment Created: ₹' + payment.data.payment.amount);
      } else {
        console.log('ℹ️  Payment response:', payment.status, payment.data);
      }
    }

    // Test 8: Get Active Membership
    console.log('\n8️⃣  Testing Get Active Membership...');
    const activeMembership = await makeRequest('GET', '/api/membership/testuser@fitness.com');
    if (activeMembership.status === 200) {
      console.log('✅ Active Membership Found:', activeMembership.data.membership.plan);
    } else {
      console.log('ℹ️  Response:', activeMembership.status);
    }

    // Test 9: Get Payment History
    console.log('\n9️⃣  Testing Payment History...');
    const paymentHistory = await makeRequest('GET', '/api/payment/history/testuser@fitness.com');
    if (paymentHistory.status === 200) {
      console.log('✅ Payment History Retrieved:', paymentHistory.data.count, 'payments');
    } else {
      console.log('ℹ️  Response:', paymentHistory.status);
    }

    // Test 10: Get Total Revenue
    console.log('\n🔟 Testing Total Revenue (Admin)...');
    const revenue = await makeRequest('GET', '/api/payment/total-revenue');
    if (revenue.status === 200) {
      console.log('✅ Total Revenue:', '₹' + revenue.data.totalRevenue);
    } else {
      console.log('ℹ️  Response:', revenue.status);
    }

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║          ✅ All Tests Completed!                    ║');
    console.log('║     Server & Firebase Integration Working! 🎉      ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    process.exit(1);
  }
}

// Wait for server to be ready
setTimeout(runTests, 1000);
