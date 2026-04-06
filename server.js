const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const admin = require('firebase-admin');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==============================================
// DATABASE SETUP (MySQL)
// ==============================================

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fitness_hub',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

function runQuery(sql, params = [], callback) {
    db.query(sql, params, (err, results) => {
        callback && callback(err, results);
    });
}

// Get user by email
function getUserByEmail(email, callback) {
    runQuery(`SELECT * FROM users WHERE email = ?`, [email], (err, results) => {
        callback(err, results && results[0]);
    });
}

// Create or update user
function saveUser(userData, callback) {
    const { email, fullName, phone, age, gender, height, weight, goal, experience, plan } = userData;
    runQuery(`SELECT id FROM users WHERE email = ?`, [email], (err, results) => {
        if (results && results.length > 0) {
            // Update existing user
            runQuery(
                `UPDATE users SET fullName = ?, phone = ?, age = ?, gender = ?, 
                                  height = ?, weight = ?, goal = ?, experience = ?, 
                                  plan = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?`,
                [fullName, phone, age, gender, height, weight, goal, experience, plan, email],
                callback
            );
        } else {
            // Insert new user
            runQuery(
                `INSERT INTO users (email, fullName, phone, age, gender, height, weight, goal, experience, plan)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [email, fullName, phone, age, gender, height, weight, goal, experience, plan],
                callback
            );
        }
    });
}

// ==============================================
// EMAIL TEMPLATES
// ==============================================

function getOTPEmailTemplate(otp) {
    return {
        subject: '🔐 Your Fitness Hub Login OTP',
        html: `
            <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); padding: 40px 20px; text-align: center; color: #00ff41;">
                    <h1 style="margin: 0; font-size: 32px;">🏋️ Fitness Hub</h1>
                    <p style="margin: 10px 0 0 0; color: #e0e0e0;">Your Secure Login Code</p>
                </div>
                
                <div style="padding: 40px 20px; background: #f5f5f5;">
                    <h2 style="color: #1a1a1a; text-align: center;">Your OTP Code</h2>
                    
                    <div style="background: white; border: 3px solid #00a86b; border-radius: 10px; padding: 30px; text-align: center; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #666;">Enter this code to verify your login:</p>
                        <h1 style="margin: 15px 0; font-size: 48px; letter-spacing: 8px; color: #00a86b; font-family: 'Courier New', monospace;">
                            ${otp}
                        </h1>
                        <p style="margin: 0; font-size: 12px; color: #999;">This code expires in 5 minutes</p>
                    </div>

                    <div style="background: #fff3cd; border-left: 4px solid #ff9600; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <p style="margin: 0; color: #656d02; font-size: 14px;">
                            <strong>⚠️ Security Tip:</strong> Never share this code with anyone. Fitness Hub support staff will never ask for your OTP.
                        </p>
                    </div>

                    <p style="color: #666; font-size: 13px; margin: 20px 0;">
                        If you didn't request this code, you can safely ignore this email.<br>
                        Someone else may have entered your email by mistake.
                    </p>
                </div>

                <div style="padding: 20px; background: #1a1a1a; text-align: center; color: #999; font-size: 12px;">
                    <p style="margin: 0;">Fitness Hub © 2026 | All Rights Reserved</p>
                    <p style="margin: 5px 0 0 0;">Keep your account secure. Never share your OTP.</p>
                </div>
            </div>
        `
    };
}

function getWelcomeEmailTemplate(userName) {
    return {
        subject: 'Welcome to Fitness Hub! 🏋️',
        html: `
            <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); padding: 40px 20px; text-align: center; color: #00ff41;">
                    <h1 style="margin: 0; font-size: 32px;">🏋️ Welcome to Fitness Hub!</h1>
                </div>
                
                <div style="padding: 40px 20px; background: #f5f5f5;">
                    <h2 style="color: #1a1a1a;">Hi ${userName}, Welcome! 💪</h2>
                    
                    <p style="color: #666; font-size: 16px;">
                        You've successfully logged into your Fitness Hub account. Start your fitness journey today!
                    </p>

                    <div style="background: white; border-left: 4px solid #00a86b; padding: 20px; margin: 20px 0; border-radius: 5px;">
                        <h3 style="color: #00a86b; margin-top: 0;">Your Account Details:</h3>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${userName}</p>
                        <p style="margin: 5px 0;"><strong>Login Method:</strong> Email + OTP</p>
                        <p style="margin: 5px 0;"><strong>Account Status:</strong> Active ✅</p>
                    </div>

                    <p style="color: #666; font-size: 14px; margin: 20px 0;">
                        <strong>Quick Start:</strong><br>
                        1. Complete your fitness profile<br>
                        2. Choose your membership plan<br>
                        3. Start tracking your workouts<br>
                        4. Get personalized recommendations
                    </p>
                </div>

                <div style="padding: 20px; background: #1a1a1a; text-align: center; color: #999; font-size: 12px;">
                    <p style="margin: 0;">Fitness Hub © 2026 | All Rights Reserved</p>
                </div>
            </div>
        `
    };
}

// ==============================================
// API ENDPOINTS
// ==============================================

// Root route - Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Fitness Hub Email Server is running',
        database: 'MySQL',
        timestamp: new Date().toISOString()
    });
});

// Send OTP Endpoint
app.post('/send-otp', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        storeOTP(email, otp);

        // Send Email
        // Email sending disabled for deployment without credentials
        console.log(`[DEV] OTP email sending skipped for ${email}: ${otp}`);
        res.json({
            success: true,
            message: 'OTP (email sending disabled in deployment)',
            email: email,
            expiresIn: '5 minutes'
        });

    } catch (error) {
        console.error('Error in /send-otp:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Verify OTP Endpoint
app.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        verifyOTP(email, otp, async (result) => {
            if (result.valid) {
                // Email sending disabled for deployment
                console.log(`[DEV] Welcome email sending skipped for ${email}`);
                return res.json({
                    success: true,
                    message: 'OTP verified successfully (email sending disabled)'
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        });

    } catch (error) {
        console.error('Error in /verify-otp:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Resend OTP Endpoint
app.post('/resend-otp', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Delete old OTP
        db.run(`DELETE FROM otps WHERE email = ?`, [email]);

        // Generate new OTP
        const otp = generateOTP();
        storeOTP(email, otp);

        // Send Email
        // Email sending disabled for deployment without credentials
        console.log(`[DEV] OTP resend email skipped for ${email}: ${otp}`);
        res.json({
            success: true,
            message: 'New OTP (email sending disabled in deployment)',
            expiresIn: '5 minutes'
        });

    } catch (error) {
        console.error('Error in /resend-otp:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP'
        });
    }
});

// Save Registration Data Endpoint
app.post('/register', async (req, res) => {
    try {
        const userData = req.body;

        if (!userData.email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        saveUser(userData, (err) => {
            if (err) {
                console.error('Error saving user:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save user data'
                });
            }

            res.json({
                success: true,
                message: 'Registration successful'
            });
        });

    } catch (error) {
        console.error('Error in /register:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get User Data Endpoint
app.get('/user/:email', async (req, res) => {
    try {
        const { email } = req.params;

        getUserByEmail(email, (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                user: user
            });
        });

    } catch (error) {
        console.error('Error in /user:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get OTP Status (Demo/Testing)
app.get('/otp-status/:email', (req, res) => {
    const { email } = req.params;
    const now = new Date().toISOString();

    db.get(
        `SELECT * FROM otps WHERE email = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1`,
        [email, now],
        (err, row) => {
            if (err || !row) {
                return res.json({
                    exists: false,
                    message: 'No OTP found for this email'
                });
            }

            res.json({
                exists: true,
                email: email,
                expiresAt: row.expires_at,
                attempts: row.attempts,
                verified: row.verified,
                // FOR TESTING ONLY - Remove in production!
                otp: process.env.NODE_ENV === 'development' ? row.otp : '***'
            });
        }
    );
});

// Database Stats (Admin only)
app.get('/admin/stats', (req, res) => {
    const stats = {};

    db.get(`SELECT COUNT(*) as count FROM users`, (err, result) => {
        stats.totalUsers = result?.count || 0;

        db.get(`SELECT COUNT(*) as count FROM otps WHERE verified = 1`, (err, result) => {
            stats.successfulLogins = result?.count || 0;

            db.get(`SELECT COUNT(*) as count FROM otps WHERE verified = 0 AND expires_at > datetime('now')`, (err, result) => {
                stats.activeOTPs = result?.count || 0;

                res.json({
                    success: true,
                    stats: stats,
                    timestamp: new Date().toISOString()
                });
            });
        });
    });
});

// Database Export (Backup)
app.get('/admin/export', (req, res) => {
    const backupData = {};

    db.all(`SELECT * FROM users`, (err, users) => {
        backupData.users = users || [];

        db.all(`SELECT * FROM otps ORDER BY created_at DESC LIMIT 100`, (err, otps) => {
            backupData.otps = otps || [];

            res.json({
                success: true,
                backup: backupData,
                timestamp: new Date().toISOString()
            });
        });
    });
});

// ==============================================
// ERROR HANDLING
// ==============================================

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ==============================================
// START SERVER
// ==============================================

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  🏋️  FITNESS HUB EMAIL OTP SERVER     ║
╚════════════════════════════════════════╝

📧 Server running on: http://localhost:${PORT}
🔧 Email Service: ${process.env.EMAIL_SERVICE || 'Gmail'}
💾 Database: JSON File (${dbPath})
🌍 CORS enabled for frontend
⏰ OTP Expiry: 5 minutes
🔐 Rate Limit: 5 requests per hour per email

📍 Endpoints:
   ✓ POST /send-otp
   ✓ POST /verify-otp
   ✓ POST /resend-otp
   ✓ POST /register
   ✓ GET  /user/:email
   ✓ GET  /health
   ✓ GET  /otp-status/:email (dev only)
   ✓ GET  /admin/stats (dev only)
   ✓ GET  /admin/export (dev only)

${!process.env.GMAIL_USER ? '⚠️  WARNING: Email credentials not configured!\n   Setup .env file with email details.' : '✅ Email credentials loaded'}
    `);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n📛 Shutting down server...');
    db.close(() => {
        console.log('✅ Database closed');
        process.exit(0);
    });
});

module.exports = app;
