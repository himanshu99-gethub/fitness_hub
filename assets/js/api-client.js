const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000/api'
    : 'https://gym-fitness-production-c08e.up.railway.app/api'; 

async function apiRegisterUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Registration error:', error);
        return { success: false, error: error.message };
    }
}

async function apiLoginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
    }
}

async function apiGenerateOTP(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/otp/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'OTP generation failed');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ OTP generation error:', error);
        return { success: false, error: error.message };
    }
}

async function apiVerifyOTP(email, otp) {
    try {
        const response = await fetch(`${API_BASE_URL}/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'OTP verification failed');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ OTP verification error:', error);
        return { success: false, error: error.message };
    }
}

async function apiCreateMembership(email, plan, price, duration = 30) {
    try {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
        const response = await fetch(`${API_BASE_URL}/membership/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email, plan, price,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Membership creation failed');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Membership creation error:', error);
        return { success: false, error: error.message };
    }
}

async function apiGetActiveMembership(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/membership/${email}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch membership');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Membership fetch error:', error);
        return { success: false, error: error.message };
    }
}

async function apiGetMembershipHistory(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/membership/history/${email}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch membership history');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Membership history error:', error);
        return { success: false, error: error.message };
    }
}

async function apiCreatePayment(email, membershipId, amount, method = 'card') {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email, membershipId, amount, method,
                transactionId: `TXN_${Date.now()}`
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Payment failed');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Payment error:', error);
        return { success: false, error: error.message };
    }
}

async function apiGetPaymentHistory(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/history/${email}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch payment history');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Payment history error:', error);
        return { success: false, error: error.message };
    }
}

async function apiGetTotalRevenue() {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/total-revenue`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch revenue');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Revenue fetch error:', error);
        return { success: false, error: error.message };
    }
}

async function apiHealthCheck() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Server is down');
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Health check error:', error);
        return { success: false, error: error.message };
    }
}

async function apiValidateSession(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/validate-session?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-email': email
            }
        });
        if (!response.ok) return { success: false, isAuthenticated: false, error: 'Session not found' };
        const result = await response.json();
        return { 
            success: true, 
            isAuthenticated: true, 
            user: result.user,
            session: result.session 
        };
    } catch (error) {
        console.error('❌ Session validation error:', error);
        return { success: false, isAuthenticated: false, error: error.message };
    }
}

async function apiLogoutUser(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Logout failed');
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('❌ Logout error:', error);
        return { success: false, error: error.message };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiRegisterUser, apiLoginUser, apiGenerateOTP, apiVerifyOTP,
        apiCreateMembership, apiGetActiveMembership, apiGetMembershipHistory,
        apiCreatePayment, apiGetPaymentHistory, apiGetTotalRevenue,
        apiHealthCheck, apiValidateSession, apiLogoutUser
    };
}
