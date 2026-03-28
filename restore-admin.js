// Restore Admin Account to Firebase
const https = require('https');

const DATABASE_URL = 'https://fitness-hub-70592-default-rtdb.firebaseio.com';

// New admin account
const adminData = {
  email: 'admin@fitnesshub.com',
  password: 'Admin@123456',
  name: 'Admin Account',
  role: 'admin',
  isActive: true,
  isDeleted: false,
  createdAt: new Date().toISOString()
};

// URL encode the email for Firebase path
const emailPath = adminData.email.replace(/\./g, '_');

const options = {
  hostname: 'fitness-hub-70592-default-rtdb.firebaseio.com',
  path: `/users/${emailPath}.json`,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('✅ Admin account created successfully!');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(JSON.stringify(adminData));
req.end();
