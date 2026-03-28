// ============================================
// API CLIENT - Firebase Integration
// ============================================
// This file handles all API communication with the backend server
// Auto-detects environment (localhost vs production)

// Auto-detect API URL based on environment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000/api'
    : 'https://gym-fitness-production-c08e.up.railway.app/api'; // Production Railway URL

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * Register a new user
 */
async function apiRegisterUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                password: userData.password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Registration error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Login user
 */
async function apiLoginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// OTP ENDPOINTS
// ============================================

/**
 * Generate OTP
 */
async function apiGenerateOTP(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/otp/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'OTP generation failed');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ OTP generation error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify OTP
 */
async function apiVerifyOTP(email, otp) {
    try {
        const response = await fetch(`${API_BASE_URL}/otp/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, otp })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'OTP verification failed');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ OTP verification error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// MEMBERSHIP ENDPOINTS
// ============================================

/**
 * Create membership
 */
async function apiCreateMembership(email, plan, price, duration = 30) {
    try {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

        const response = await fetch(`${API_BASE_URL}/membership/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                plan,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                price
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Membership creation failed');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Membership creation error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get active membership
 */
async function apiGetActiveMembership(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/membership/${email}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch membership');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Membership fetch error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get membership history
 */
async function apiGetMembershipHistory(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/membership/history/${email}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch membership history');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Membership history error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// PAYMENT ENDPOINTS
// ============================================

/**
 * Create payment
 */
async function apiCreatePayment(email, membershipId, amount, method = 'card') {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                membershipId,
                amount,
                method,
                transactionId: `TXN_${Date.now()}`
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Payment failed');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Payment error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get payment history
 */
async function apiGetPaymentHistory(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/history/${email}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch payment history');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Payment history error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get total revenue (admin only)
 */
async function apiGetTotalRevenue() {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/total-revenue`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch revenue');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Revenue fetch error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Check server health
 */
async function apiHealthCheck() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Server is down');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Health check error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiRegisterUser,
        apiLoginUser,
        apiGenerateOTP,
        apiVerifyOTP,
        apiCreateMembership,
        apiGetActiveMembership,
        apiGetMembershipHistory,
        apiCreatePayment,
        apiGetPaymentHistory,
        apiGetTotalRevenue,
        apiHealthCheck
    };
}
