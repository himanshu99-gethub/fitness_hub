let API_BASE_URL = window.location.origin + '/api'; 

// Fallback for local development via file:// protocol
if (window.location.protocol === 'file:') {
    API_BASE_URL = 'http://localhost:5000/api';
}
async function apiRegisterUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return await response.json();
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
        return await response.json();
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
    }
}

async function apiGetProfile(emailParam = null) {
    try {
        let email = emailParam;
        
        if (!email) {
            // Try to get from session if not provided
            const session = localStorage.getItem('fitnesshub_session');
            if (session) {
                // Handle both plain email and JSON string
                try {
                    const parsed = JSON.parse(session);
                    email = parsed.email || session;
                } catch (e) {
                    email = session;
                }
            }
        }

        if (!email || email === 'undefined') {
            return { success: false, message: 'User session missing' };
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/profile/${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch profile');
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ Profile fetch error:', error);
        return { success: false, message: error.message };
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

async function apiCreateMembership(emailOrData, plan, price, duration = 30) {
    try {
        let payload;
        if (typeof emailOrData === 'object' && !plan) {
            payload = {
                email: emailOrData.email,
                plan: emailOrData.plan || emailOrData.planName || emailOrData.type,
                price: emailOrData.price || emailOrData.amount,
                duration: emailOrData.duration || 30,
                startDate: emailOrData.startDate || new Date().toISOString(),
                endDate: emailOrData.endDate || new Date(Date.now() + (emailOrData.duration || 30) * 24 * 60 * 60 * 1000).toISOString()
            };
        } else {
            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
            payload = {
                email: emailOrData,
                plan,
                price,
                duration,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            };
        }

        const response = await fetch(`${API_BASE_URL}/membership/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Membership creation error:', error);
        return { success: false, error: error.message };
    }
}

async function apiActivateMembership(dataOrId, maybeMemId) {
    try {
        let payload;
        if (typeof dataOrId === 'object') {
            payload = dataOrId;
        } else {
            payload = { userId: dataOrId, membershipId: maybeMemId };
        }

        const response = await fetch(`${API_BASE_URL}/membership/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Membership activation error:', error);
        return { success: false, error: error.message };
    }
}

async function apiGetLatestMembership(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/membership/latest/${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Get latest membership error:', error);
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
        const response = await fetch(`${API_BASE_URL}/payments/create`, {
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

async function apiGetPaymentStatus(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/status/${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get payment status');
        }
        return await response.json();
    } catch (error) {
        console.error('❌ Payment status error:', error);
        return { success: false, error: error.message, hasPaid: false, isRegistered: false };
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
        apiRegisterUser, apiLoginUser, apiGetProfile, apiGenerateOTP, apiVerifyOTP,
        apiCreateMembership, apiActivateMembership, apiGetLatestMembership, apiGetActiveMembership, apiGetMembershipHistory,
        apiCreatePayment, apiGetPaymentHistory, apiGetTotalRevenue,
        apiHealthCheck, apiValidateSession, apiLogoutUser
    };
}
