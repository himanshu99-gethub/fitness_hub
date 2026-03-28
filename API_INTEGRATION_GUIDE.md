# 🚀 API Integration Guide

## Quick Start

### 1. Server चलाओ
```bash
node server-firebase-ready.js
```
Output:
```
🚀 Fitness Hub Server Ready!
Port: 5000
Database: Firebase Realtime DB
Status: ✅ Connected
```

### 2. HTML में script add करो
```html
<script src="assets/js/api-client.js"></script>
```

### 3. API use करो

### Registration करना
```javascript
const result = await apiRegisterUser({
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '1234567890',
    password: 'Pass123!'
});

if (result.success) {
    console.log('✅ User registered:', result.data);
} else {
    console.log('❌ Error:', result.error);
}
```

### Login करना
```javascript
const result = await apiLoginUser('user@example.com', 'Pass123!');

if (result.success) {
    console.log('✅ Logged in:', result.data.user.email);
} else {
    console.log('❌ Login failed:', result.error);
}
```

### OTP generate करना
```javascript
const result = await apiGenerateOTP('user@example.com');

if (result.success) {
    const otp = result.data.otp;
    console.log('📱 OTP:', otp); // For testing
}
```

### OTP verify करना
```javascript
const result = await apiVerifyOTP('user@example.com', '123456');

if (result.success) {
    console.log('✅ OTP verified');
} else {
    console.log('❌ Invalid OTP:', result.error);
}
```

### Membership create करना
```javascript
const result = await apiCreateMembership(
    'user@example.com',
    'premium',
    2999,
    30 // duration in days
);

if (result.success) {
    const membershipId = result.data.membership.membershipId;
    console.log('✅ Membership created:', membershipId);
}
```

### Payment करना
```javascript
const result = await apiCreatePayment(
    'user@example.com',
    membershipId,
    2999,
    'card'
);

if (result.success) {
    console.log('✅ Payment successful');
}
```

### Payment history लेना
```javascript
const result = await apiGetPaymentHistory('user@example.com');

if (result.success) {
    console.log('💳 Payments:', result.data.payments);
}
```

### Active membership लेना
```javascript
const result = await apiGetActiveMembership('user@example.com');

if (result.success) {
    console.log('✅ Active membership:', result.data.membership);
} else {
    console.log('ℹ️ No active membership');
}
```

### Server health check करना
```javascript
const result = await apiHealthCheck();

if (result.success) {
    console.log('🟢 Server is running');
    console.log('Database:', result.data.database);
} else {
    console.log('🔴 Server is down');
}
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### OTP
- `POST /api/otp/generate` - Generate OTP
- `POST /api/otp/verify` - Verify OTP

### Membership
- `POST /api/membership/create` - Create membership
- `GET /api/membership/:userId` - Get active membership
- `GET /api/membership/history/:userId` - Get all memberships
- `POST /api/membership/update-status` - Update membership status

### Payment
- `POST /api/payment/create` - Create payment record
- `GET /api/payment/history/:userId` - Get payment history
- `GET /api/payment/total-revenue` - Get total revenue (admin)

### Health
- `GET /api/health` - Server health check

---

## Error Handling

```javascript
async function makeAPICall() {
    const result = await apiLoginUser('email@test.com', 'password');
    
    if (result.success) {
        // Success
        console.log('✅', result.data);
    } else {
        // Error
        console.error('❌', result.error);
        // Handle different error types
        if (result.error.includes('404')) {
            console.log('User not found');
        } else if (result.error.includes('401')) {
            console.log('Invalid credentials');
        }
    }
}
```

---

## Complete Flow Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>API Test</title>
</head>
<body>
    <h1>Firebase Fitness Hub API Test</h1>
    
    <script src="assets/js/api-client.js"></script>
    <script>
        // Test flow
        async function testCompleteFlow() {
            // 1. Check server
            console.log('1️⃣ Checking server...');
            let health = await apiHealthCheck();
            if (!health.success) {
                console.error('❌ Server is down!');
                return;
            }
            console.log('✅ Server is running');

            // 2. Register
            console.log('2️⃣ Registering user...');
            let register = await apiRegisterUser({
                email: 'testuser@example.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '9999999999',
                password: 'Test@123'
            });
            if (!register.success) {
                console.error('❌ Registration failed:', register.error);
                return;
            }
            console.log('✅ User registered');

            // 3. Login
            console.log('3️⃣ Logging in...');
            let login = await apiLoginUser('testuser@example.com', 'Test@123');
            if (!login.success) {
                console.error('❌ Login failed:', login.error);
                return;
            }
            console.log('✅ Login successful');

            // 4. Generate OTP
            console.log('4️⃣ Generating OTP...');
            let otp = await apiGenerateOTP('testuser@example.com');
            if (!otp.success) {
                console.error('❌ OTP generation failed');
                return;
            }
            console.log('✅ OTP generated:', otp.data.otp);

            // 5. Create membership
            console.log('5️⃣ Creating membership...');
            let membership = await apiCreateMembership('testuser@example.com', 'premium', 2999, 30);
            if (!membership.success) {
                console.error('❌ Membership creation failed');
                return;
            }
            console.log('✅ Membership created:', membership.data.membership.membershipId);

            // 6. Create payment
            console.log('6️⃣ Creating payment...');
            let payment = await apiCreatePayment('testuser@example.com', membership.data.membership.membershipId, 2999);
            if (!payment.success) {
                console.error('❌ Payment failed');
                return;
            }
            console.log('✅ Payment successful');

            console.log('\n✅ Complete flow test passed!');
        }

        // Run test on page load
        testCompleteFlow();
    </script>
</body>
</html>
```

---

## Notes

1. **API Base URL**: `http://localhost:5000/api`
2. **CORS**: Enabled for all origins (change in production)
3. **Database**: Firebase Realtime Database
4. **Session Storage**: localStorage (temporary cache)
5. **Authentication**: Email/Password (can be extended)

सब कुछ ready है! 🎉
