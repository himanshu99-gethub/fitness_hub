// ============================================
// FIREBASE CLOUD FUNCTION - EMAIL OTP
// Deploy this to Firebase Cloud Functions
// ============================================

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const cors = require('cors')({origin: true});

// Configure your email service
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'shakyahimanshu40210@gmail.com', // Change this
        pass: 'hfxl qmlp lsjt ytye' // Use Gmail app password
    }
});

// Store OTPs in Firestore (in-memory in this example)
// For production, use Firestore Database
const otpStore = new Map();

// ============================================
// SEND OTP FUNCTION
// ============================================

exports.sendOTP = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email format' 
            });
        }

        try {
            // Generate OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Store OTP with expiry (5 minutes)
            otpStore.set(email, {
                otp: otp,
                expiresAt: Date.now() + (5 * 60 * 1000),
                attempts: 0
            });

            // Auto-delete after 5 minutes
            setTimeout(() => {
                otpStore.delete(email);
            }, 5 * 60 * 1000);

            // Send email
            const mailOptions = {
                from: 'Fitness Hub <your-email@gmail.com>',
                to: email,
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
                                    <strong>⚠️ Security Tip:</strong> Never share this code with anyone.
                                </p>
                            </div>

                            <p style="color: #666; font-size: 13px; margin: 20px 0;">
                                If you didn't request this code, you can safely ignore this email.
                            </p>
                        </div>

                        <div style="padding: 20px; background: #1a1a1a; text-align: center; color: #999; font-size: 12px;">
                            <p style="margin: 0;">Fitness Hub © 2026 | All Rights Reserved</p>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);

            console.log(`✅ OTP sent to ${email}`);

            return res.json({
                success: true,
                message: 'OTP sent successfully to your email',
                email: email
            });

        } catch (error) {
            console.error('Error sending OTP:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP: ' + error.message
            });
        }
    });
});

// ============================================
// VERIFY OTP FUNCTION
// ============================================

exports.verifyOTP = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP required'
            });
        }

        try {
            const stored = otpStore.get(email);

            if (!stored) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP not found or expired'
                });
            }

            if (Date.now() > stored.expiresAt) {
                otpStore.delete(email);
                return res.status(400).json({
                    success: false,
                    message: 'OTP expired'
                });
            }

            if (stored.attempts >= 5) {
                otpStore.delete(email);
                return res.status(400).json({
                    success: false,
                    message: 'Too many attempts. Request new OTP.'
                });
            }

            if (stored.otp !== otp) {
                stored.attempts++;
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP'
                });
            }

            // OTP is correct - delete it
            otpStore.delete(email);

            // Send welcome email (optional)
            try {
                await transporter.sendMail({
                    from: 'Fitness Hub <your-email@gmail.com>',
                    to: email,
                    subject: 'Welcome to Fitness Hub! 🏋️',
                    html: `
                        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); padding: 40px 20px; text-align: center; color: #00ff41;">
                                <h1 style="margin: 0; font-size: 32px;">🏋️ Welcome to Fitness Hub!</h1>
                            </div>
                            
                            <div style="padding: 40px 20px; background: #f5f5f5;">
                                <h2 style="color: #1a1a1a;">Login Successful! 💪</h2>
                                <p style="color: #666; font-size: 16px;">
                                    You have successfully logged into your Fitness Hub account.
                                </p>
                                <p style="color: #666; font-size: 14px;">
                                    Start your fitness journey today!
                                </p>
                            </div>

                            <div style="padding: 20px; background: #1a1a1a; text-align: center; color: #999; font-size: 12px;">
                                <p style="margin: 0;">Fitness Hub © 2026</p>
                            </div>
                        </div>
                    `
                });
            } catch (err) {
                console.log('Welcome email skipped');
            }

            return res.json({
                success: true,
                message: 'OTP verified successfully'
            });

        } catch (error) {
            console.error('Error verifying OTP:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    });
});

// ============================================
// RESEND OTP FUNCTION
// ============================================

exports.resendOTP = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        try {
            // Delete old OTP
            otpStore.delete(email);

            // Generate new OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Store new OTP
            otpStore.set(email, {
                otp: otp,
                expiresAt: Date.now() + (5 * 60 * 1000),
                attempts: 0
            });

            // Auto-delete after 5 minutes
            setTimeout(() => {
                otpStore.delete(email);
            }, 5 * 60 * 1000);

            // Send email
            const mailOptions = {
                from: 'Fitness Hub <your-email@gmail.com>',
                to: email,
                subject: '🔐 Your Fitness Hub Login OTP (Resent)',
                html: `
                    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); padding: 40px 20px; text-align: center; color: #00ff41;">
                            <h1 style="margin: 0; font-size: 32px;">🏋️ Fitness Hub</h1>
                        </div>
                        
                        <div style="padding: 40px 20px; background: #f5f5f5;">
                            <h2 style="color: #1a1a1a; text-align: center;">New OTP Code</h2>
                            
                            <div style="background: white; border: 3px solid #00a86b; border-radius: 10px; padding: 30px; text-align: center; margin: 20px 0;">
                                <p style="margin: 0; font-size: 14px; color: #666;">Your new verification code:</p>
                                <h1 style="margin: 15px 0; font-size: 48px; letter-spacing: 8px; color: #00a86b; font-family: 'Courier New', monospace;">
                                    ${otp}
                                </h1>
                                <p style="margin: 0; font-size: 12px; color: #999;">This code expires in 5 minutes</p>
                            </div>
                        </div>

                        <div style="padding: 20px; background: #1a1a1a; text-align: center; color: #999; font-size: 12px;">
                            <p style="margin: 0;">Fitness Hub © 2026</p>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);

            console.log(`✅ OTP resent to ${email}`);

            return res.json({
                success: true,
                message: 'New OTP sent to your email'
            });

        } catch (error) {
            console.error('Error resending OTP:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to resend OTP: ' + error.message
            });
        }
    });
});

// ============================================
// HEALTH CHECK
// ============================================

exports.health = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        res.json({
            status: 'OK',
            message: 'Fitness Hub Firebase Functions are running',
            timestamp: new Date().toISOString()
        });
    });
});
