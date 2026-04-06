const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Supabase initialization
const { 
  createUser, findUserByEmail, generateOTP, verifyOTP, 
  createMembership, activateMembership, getUserActiveMembership, getUserLatestMembership, createPayment, getUserPayments,
  getAllUsers, deleteUser
} = require('./functions/supabaseHelpers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==============================================
// API ROUTES
// ==============================================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Fitness Hub Server is running (Supabase Edition)',
        database: 'Supabase PostgreSQL',
        timestamp: new Date().toISOString()
    });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const result = await createUser(req.body);
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await findUserByEmail(email);
        if (result.success && result.user) {
            if (result.user.password === password) {
                res.json({ success: true, user: result.user });
            } else {
                res.status(401).json({ success: false, error: 'Invalid password' });
            }
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Profile Route
app.get('/api/auth/profile/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const result = await findUserByEmail(email);
        if (result.success && result.user) {
            // Remove password before sending
            const { password, ...userProfile } = result.user;
            res.json({ success: true, user: userProfile });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// OTP Routes
app.post('/api/otp/generate', async (req, res) => {
    try {
        const { email } = req.body;
        const result = await generateOTP(email);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/otp/verify', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await verifyOTP(email, otp);
        if (result.success) {
            res.json({ ...result, verified: true });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Membership Routes
app.post('/api/membership/create', async (req, res) => {
    try {
        const result = await createMembership(req.body);
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/membership/activate', async (req, res) => {
    try {
        const { userId, email, membershipId } = req.body;
        const identifier = userId || email;
        
        if (!identifier || !membershipId) {
            return res.status(400).json({ success: false, error: 'Missing identifier (userId/email) or membershipId' });
        }
        
        const result = await activateMembership(identifier, membershipId);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/membership/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const userResult = await findUserByEmail(email);
        if (userResult.success && userResult.user) {
            const result = await getUserActiveMembership(userResult.user.id);
            res.json(result);
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/membership/latest/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const userResult = await findUserByEmail(email);
        if (userResult.success && userResult.user) {
            const result = await getUserLatestMembership(userResult.user.id);
            res.json(result);
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Payment Routes
app.post('/api/payments/create', async (req, res) => {
    try {
        const { userId, email, amount, method, transactionId, membershipId } = req.body;
        const identifier = userId || email;
        
        if (!identifier || !amount || !membershipId) {
            return res.status(400).json({ success: false, error: 'Missing required payment fields' });
        }
        
        const result = await createPayment({
            userId: identifier,
            amount,
            method,
            transactionId,
            membershipId
        });
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/payment/history/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const userResult = await findUserByEmail(email);
        if (userResult.success && userResult.user) {
            const result = await getUserPayments(userResult.user.id);
            res.json({ success: true, payments: result.payments, count: result.payments.length });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await getAllUsers();
        if (result.success) {
            res.json({ success: true, users: result.users });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/admin/user/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteUser(id);
        if (result.success) {
            res.json({ success: true, message: 'User deleted and account purged successfully' });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'pages/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'pages/register.html')));

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  ⚡  FITNESS HUB - SUPABASE SERVER   ║
╚════════════════════════════════════════╝

🚀 Server running on: http://localhost:${PORT}
📂 Serving files from: ${__dirname}
⚡ Supabase URL: ${process.env.SUPABASE_URL}
📍 API Base: http://localhost:${PORT}/api

✅ Supabase integration ready!
    `);
});
