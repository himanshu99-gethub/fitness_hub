// ============================================
// AUTHENTICATION & REGISTRATION FUNCTIONALITY
// ============================================
// Fully offline-capable: uses localStorage + sessionStorage
// No backend server required

// ─── GLOBALS ────────────────────────────────────────────────
let currentStep = 1;
let selectedPlan = null;
let userFormData = {};
let otpTimerInterval = null;
let resetOtpTimerInterval = null;

// ─── STORAGE KEYS ───────────────────────────────────────────
const KEY_SESSION    = 'fitnesshub_session';

// ============================================
// SESSION HELPERS
// ============================================

function getSession() {
    try {
        const raw = localStorage.getItem(KEY_SESSION);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function clearAllStorage() {
    // Clear only fitnesshub related keys to be safe
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('fitnesshub_')) {
            localStorage.removeItem(key);
        }
    });
    sessionStorage.clear();
}

// ============================================
// OTP HELPERS (fully local)
// ============================================

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(email, otp) {
    const otpData = {
        otp: otp,
        email: email.toLowerCase(),
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    sessionStorage.setItem('fitnesshub_otp_data', JSON.stringify(otpData));
}

function verifyOTPCode(email, enteredOtp) {
    try {
        const raw = sessionStorage.getItem('fitnesshub_otp_data');
        if (!raw) return { success: false, message: 'OTP not found. Please request a new one.' };

        const otpData = JSON.parse(raw);

        if (otpData.email !== email.toLowerCase()) {
            return { success: false, message: 'OTP email mismatch.' };
        }
        if (Date.now() > otpData.expiresAt) {
            sessionStorage.removeItem('fitnesshub_otp_data');
            return { success: false, message: 'OTP has expired. Please request a new one.' };
        }
        if (otpData.otp !== enteredOtp) {
            return { success: false, message: 'Incorrect OTP. Please try again.' };
        }

        // Valid — remove it
        sessionStorage.removeItem('fitnesshub_otp_data');
        return { success: true };
    } catch (e) {
        return { success: false, message: 'Verification error. Please try again.' };
    }
}

// ============================================
// SHOW ALERT (inline, no Bootstrap required)
// ============================================

function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.setAttribute('role', 'alert');
    alertDiv.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 16px;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: fadeIn 0.2s ease;
        border-left: 3px solid;
    `;

    const colors = {
        success: { bg: 'rgba(0,212,100,0.1)', border: '#00d464', color: '#4fffaa', icon: '✅' },
        error:   { bg: 'rgba(255,68,68,0.1)',  border: '#ff4444', color: '#ff8080', icon: '❌' },
        info:    { bg: 'rgba(0,212,255,0.1)',  border: '#00d4ff', color: '#80eaff', icon: 'ℹ️' },
        warning: { bg: 'rgba(255,170,0,0.1)',  border: '#ffaa00', color: '#ffd080', icon: '⚠️' }
    };

    const c = colors[type] || colors.info;
    alertDiv.style.background = c.bg;
    alertDiv.style.borderColor = c.border;
    alertDiv.style.color = c.color;
    alertDiv.innerHTML = `<span>${c.icon}</span> <span>${message}</span>`;

    // Find best container
    let container =
        (document.getElementById('otpVerificationForm')?.style.display !== 'none'
            ? document.getElementById('otpAlertContainer') : null) ||
        document.getElementById('alertContainer') ||
        document.getElementById('otpAlertContainer') ||
        document.querySelector('.auth-form') ||
        document.querySelector('.login-right') ||
        document.querySelector('.container') ||
        document.body;

    // Clear stale alerts in dedicated containers
    if (container && (container.id === 'alertContainer' || container.id === 'otpAlertContainer')) {
        container.innerHTML = '';
    }

    container.insertBefore(alertDiv, container.firstChild);

    // Auto-dismiss after 5s
    setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
}

// ============================================
// FORM NAVIGATION (Registration)
// ============================================

function nextStep(step) {
    if (!validateStep(step)) return;
    saveStepData(step);

    if (step === 3) {
        completeRegistration();
    } else {
        currentStep = step + 1;
        updateFormView();
    }
}

function prevStep(step) {
    currentStep = step - 1;
    updateFormView();
}

function updateFormView() {
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    const active = document.getElementById(`step${currentStep}`);
    if (active) active.classList.add('active');

    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx + 1 === currentStep) el.classList.add('active');
        else if (idx + 1 < currentStep) el.classList.add('completed');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// VALIDATION
// ============================================

function validateStep(step) {
    switch (step) {
        case 1: return validatePersonalInfo();
        case 2: return validateFitnessProfile();
        case 3: return validatePlanSelection();
        default: return true;
    }
}

function validatePersonalInfo() {
    const fullName = document.getElementById('fullName')?.value.trim();
    const email    = document.getElementById('email')?.value.trim();
    const phone    = document.getElementById('phone')?.value.trim();
    const password = document.getElementById('password')?.value;
    const confirm  = document.getElementById('confirmPassword')?.value;

    if (!fullName)                   { showAlert('Please enter your full name', 'error'); return false; }
    if (!email || !isValidEmail(email)) { showAlert('Please enter a valid email', 'error'); return false; }
    if (!phone || phone.replace(/\D/g,'').length < 10) { showAlert('Please enter a valid phone number (at least 10 digits)', 'error'); return false; }
    if (!password || password.length < 6) { showAlert('Password must be at least 6 characters', 'error'); return false; }
    if (password !== confirm)         { showAlert('Passwords do not match', 'error'); return false; }

    // Check if email already registered
    if (findUser(email)) {
        showAlert('This email is already registered. Please login instead.', 'error');
        return false;
    }

    return true;
}

function validateFitnessProfile() {
    const age        = document.getElementById('age')?.value;
    const gender     = document.getElementById('gender')?.value;
    const height     = document.getElementById('height')?.value;
    const weight     = document.getElementById('weight')?.value;
    const goal       = document.getElementById('goal')?.value;
    const experience = document.getElementById('experience')?.value;

    if (!age || age < 13 || age > 120) { showAlert('Please enter a valid age (13–120)', 'error'); return false; }
    if (!gender)       { showAlert('Please select your gender', 'error');       return false; }
    if (!height || height < 100 || height > 250) { showAlert('Please enter a valid height (100–250 cm)', 'error'); return false; }
    if (!weight || weight < 20  || weight > 300) { showAlert('Please enter a valid weight (20–300 kg)', 'error');  return false; }
    if (!goal)         { showAlert('Please select your fitness goal', 'error'); return false; }
    if (!experience)   { showAlert('Please select your fitness level', 'error'); return false; }

    return true;
}

function validatePlanSelection() {
    if (!selectedPlan) { showAlert('Please select a membership plan', 'error'); return false; }
    return true;
}

// ============================================
// SAVE FORM DATA
// ============================================

function saveStepData(step) {
    if (step === 1) {
        userFormData.fullName = document.getElementById('fullName').value.trim();
        userFormData.email    = document.getElementById('email').value.trim().toLowerCase();
        userFormData.phone    = document.getElementById('phone').value.trim();
        userFormData.password = document.getElementById('password').value;
    } else if (step === 2) {
        userFormData.age        = document.getElementById('age').value;
        userFormData.gender     = document.getElementById('gender').value;
        userFormData.height     = document.getElementById('height').value;
        userFormData.weight     = document.getElementById('weight').value;
        userFormData.goal       = document.getElementById('goal').value;
        userFormData.experience = document.getElementById('experience').value;
    }
}

// ============================================
// PLAN SELECTION
// ============================================

function selectPlan(planType, element) {
    const plans = {
        starter:      { name: 'Starter Pack',   price: 999  },
        professional: { name: 'Professional',   price: 1999 },
        elite:        { name: 'Elite Plus',      price: 2999 }
    };

    selectedPlan = { type: planType, ...plans[planType] };

    document.querySelectorAll('.plan-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    const info = document.getElementById('selectedPlanInfo');
    if (info) info.innerHTML = `<strong>Selected Plan:</strong> ${selectedPlan.name} — ₹${selectedPlan.price}/month`;

    const sp = document.getElementById('summaryPlan');
    const sa = document.getElementById('summaryAmount');
    const ta = document.getElementById('totalAmount');
    if (sp) sp.textContent = `${selectedPlan.name} (Monthly)`;
    if (sa) sa.textContent = `₹${selectedPlan.price}`;
    if (ta) ta.textContent = `₹${selectedPlan.price}`;
}

// ============================================
// REGISTRATION COMPLETION (localStorage only)
// ============================================

async function completeRegistration() {
    if (!userFormData.fullName || !userFormData.email || !userFormData.phone || !userFormData.password) {
        showAlert('Personal information incomplete. Please go back to step 1.', 'error');
        return;
    }
    if (!userFormData.age || !userFormData.gender) {
        showAlert('Fitness profile incomplete. Please go back to step 2.', 'error');
        return;
    }
    if (!selectedPlan) {
        showAlert('Please select a membership plan.', 'error');
        return;
    }

    const completeBtn = document.querySelector('#step3 .btn-success') ||
                        document.querySelector('button[onclick="nextStep(3)"]');
    if (completeBtn) {
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    }

    try {
        // 1. Register User on Server
        const regResult = await apiRegisterUser({
            email: userFormData.email,
            name: userFormData.fullName,
            phone: userFormData.phone,
            password: userFormData.password,
            age: parseInt(userFormData.age),
            gender: userFormData.gender,
            height: parseFloat(userFormData.height),
            weight: parseFloat(userFormData.weight),
            goal: userFormData.goal,
            experience: userFormData.experience
        });

        if (!regResult.success) {
            throw new Error(regResult.error || 'Registration failed');
        }

        const userRecord = regResult.data.user;

        // 2. Create Membership on Server (starts as 'pending')
        const memResult = await apiCreateMembership(
            userRecord.email,
            selectedPlan.name,
            selectedPlan.price,
            30
        );

        if (!memResult.success) {
            console.warn('Membership creation failed, but user was registered:', memResult.error);
        } else {
            // Store the membership ID in the user record for easier activation
            userRecord.currentMembershipId = memResult.data.membership.id;
        }

        // 3. Clear ANY legacy status flags and local storage
        clearAllStorage();

        // 4. Create Local Session (Email only)
        localStorage.setItem(KEY_SESSION, JSON.stringify({
            email:      userRecord.email,
            loginTime:  new Date().toISOString(),
            rememberMe: true,
            otpVerified: true
        }));

        // Re-save plan specifically for payment page handover
        localStorage.setItem('fitnesshub_selected_plan', JSON.stringify(selectedPlan));

        // 5. Show success step
        const successEmail = document.getElementById('successEmail');
        const successPlan  = document.getElementById('successPlan');
        if (successEmail) successEmail.textContent = userRecord.email;
        if (successPlan)  successPlan.textContent  = selectedPlan.name;

        currentStep = 4;
        updateFormView();

        userFormData = {};

        setTimeout(() => {
            window.location.replace('payment.html');
        }, 3000);

    } catch (error) {
        showAlert(error.message, 'error');
        if (completeBtn) {
            completeBtn.disabled = false;
            completeBtn.innerHTML = 'Complete Registration';
        }
    }
}

// ============================================
// LOGIN FUNCTIONALITY
// ============================================

async function handleLogin() {
    const email    = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const rememberMe = document.getElementById('rememberMe')?.checked;

    if (!email || !isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }
    if (!password) {
        showAlert('Please enter your password', 'error');
        return;
    }

    const loginBtn = document.querySelector('.btn-login');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    }

    try {
        const result = await apiLoginUser(email, password);
        
        if (!result.success) {
            throw new Error(result.error || 'Login failed');
        }

        const user = result.data.user;

        // Save session (Email only)
        localStorage.setItem(KEY_SESSION, JSON.stringify({
            email:      user.email,
            loginTime:  new Date().toISOString(),
            rememberMe: rememberMe || false,
            otpVerified: true
        }));

        showAlert('Login successful! Redirecting...', 'success');

        setTimeout(async () => {
             // Check membership status from server
             const membershipResult = await apiGetActiveMembership(user.email);
             let isPaid = false;
             
             if (membershipResult.success && membershipResult.data.membership) {
                 const membership = membershipResult.data.membership;
                 if (membership.status === 'active') {
                     isPaid = true;
                 }
             }

            if (isPaid) {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'payment.html';
            }
        }, 1000);

    } catch (error) {
        showAlert(error.message, 'error');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }
}

// ============================================
// OTP FLOW (for future email-based OTP upgrade)
// ============================================

function startOTPTimer() {
    let timeLeft = 600;
    if (otpTimerInterval) clearInterval(otpTimerInterval);

    otpTimerInterval = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        const el = document.getElementById('otpTimer');
        if (el) el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(otpTimerInterval);
            showAlert('OTP expired! Please request a new one.', 'error');
            cancelOtpVerification();
        } else if (timeLeft === 60) {
            showAlert('OTP expires in 1 minute.', 'warning');
        }
    }, 1000);
}

function verifyOTP() {
    const enteredOTP = document.getElementById('otpInput')?.value.trim();
    if (!enteredOTP) { showAlert('Please enter the OTP', 'error'); return; }
    if (enteredOTP.length !== 6) { showAlert('OTP must be 6 digits', 'error'); return; }

    const email = sessionStorage.getItem('fitnesshub_temp_email');
    const result = verifyOTPCode(email, enteredOTP);

    if (result.success) {
        showAlert('OTP Verified! Logging in...', 'success');
        clearInterval(otpTimerInterval);

        setTimeout(() => {
            const rememberMe = sessionStorage.getItem('fitnesshub_temp_remember') === 'true';
            localStorage.setItem(KEY_SESSION, JSON.stringify({
                email, loginTime: new Date().toISOString(), rememberMe, otpVerified: true
            }));

            sessionStorage.removeItem('fitnesshub_temp_otp');
            sessionStorage.removeItem('fitnesshub_temp_email');
            sessionStorage.removeItem('fitnesshub_temp_password');
            sessionStorage.removeItem('fitnesshub_temp_remember');

            const user = findUser(email);
            if (user) {
                localStorage.setItem(KEY_USER, JSON.stringify(user));
                window.location.href = user.isPaid ? 'dashboard.html' : 'payment.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }, 1500);
    } else {
        showAlert(result.message, 'error');
        const inp = document.getElementById('otpInput');
        if (inp) { inp.value = ''; inp.focus(); }
    }
}

function resendOTP() {
    const email = sessionStorage.getItem('fitnesshub_temp_email');
    const newOTP = generateOTP();
    storeOTP(email, newOTP);

    showAlert('New OTP generated!', 'success');
    setTimeout(() => {
        alert(`📧 Your New OTP:\n\n${newOTP}\n\n(Valid for 10 minutes)`);
    }, 300);

    const inp = document.getElementById('otpInput');
    if (inp) { inp.value = ''; inp.focus(); }
    startOTPTimer();
}

function cancelOtpVerification() {
    clearInterval(otpTimerInterval);
    const otpForm = document.getElementById('otpVerificationForm');
    const loginForm = document.getElementById('loginForm');
    if (otpForm)  otpForm.style.display  = 'none';
    if (loginForm) loginForm.style.display = 'block';

    ['loginEmail','loginPassword','otpInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    ['fitnesshub_temp_otp','fitnesshub_temp_email',
     'fitnesshub_temp_password','fitnesshub_temp_remember'].forEach(k => sessionStorage.removeItem(k));
}

// ============================================
// FORGOT PASSWORD FLOW
// ============================================

function handleForgotPassword() {
    const email = document.getElementById('forgotEmail')?.value.trim();

    if (!email || !isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }
    if (!isUserRegistered(email)) {
        showAlert('This email is not registered. Please sign up first.', 'error');
        return;
    }

    const resetOTP = generateOTP();
    storeOTP(email, resetOTP);
    sessionStorage.setItem('fitnesshub_reset_email', email);

    showAlert('Recovery OTP generated!', 'success');
    setTimeout(() => {
        alert(`📧 Your Recovery OTP:\n\n${resetOTP}\n\n(Valid for 10 minutes)`);
    }, 300);

    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('resetOtpForm').style.display       = 'block';

    const emailLabel = document.getElementById('resetOtpEmail');
    if (emailLabel) emailLabel.textContent = `OTP sent to: ${email}`;

    const inp = document.getElementById('resetOtpInput');
    if (inp) inp.focus();
    startResetOTPTimer();
}

function startResetOTPTimer() {
    let timeLeft = 300;
    if (resetOtpTimerInterval) clearInterval(resetOtpTimerInterval);

    resetOtpTimerInterval = setInterval(() => {
        timeLeft--;
        const el = document.getElementById('resetOtpTimer');
        if (el) el.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(resetOtpTimerInterval);
            showAlert('OTP expired! Please try again.', 'error');
            goBackToForgotPassword();
        } else if (timeLeft === 60) {
            showAlert('OTP expires in 1 minute.', 'warning');
        }
    }, 1000);
}

function verifyResetOTP() {
    const otp   = document.getElementById('resetOtpInput')?.value.trim();
    const email = sessionStorage.getItem('fitnesshub_reset_email');

    if (!otp || otp.length !== 6) {
        showAlert('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    const result = verifyOTPCode(email, otp);
    if (result.success) {
        showAlert('OTP verified! Enter your new password.', 'success');
        clearInterval(resetOtpTimerInterval);
        sessionStorage.setItem('fitnesshub_reset_token', otp);

        setTimeout(() => {
            document.getElementById('resetOtpForm').style.display      = 'none';
            document.getElementById('resetPasswordForm').style.display  = 'block';
            document.getElementById('newPassword')?.focus();
        }, 800);
    } else {
        showAlert(result.message, 'error');
        const inp = document.getElementById('resetOtpInput');
        if (inp) { inp.value = ''; inp.focus(); }
    }
}

function resendResetOTP() {
    const email = sessionStorage.getItem('fitnesshub_reset_email');
    const newOTP = generateOTP();
    storeOTP(email, newOTP);

    showAlert('New OTP generated!', 'success');
    setTimeout(() => {
        alert(`📧 Your New Recovery OTP:\n\n${newOTP}\n\n(Valid for 10 minutes)`);
    }, 300);

    const inp = document.getElementById('resetOtpInput');
    if (inp) { inp.value = ''; inp.focus(); }
    startResetOTPTimer();
}

function resetPassword() {
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPass = document.getElementById('confirmNewPassword')?.value;
    const email       = sessionStorage.getItem('fitnesshub_reset_email');

    if (!newPassword || newPassword.length < 8) {
        showAlert('Password must be at least 8 characters', 'error');
        return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        showAlert('Password must contain both letters and numbers', 'error');
        return;
    }
    if (newPassword !== confirmPass) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    const user = findUser(email);
    if (!user) { showAlert('User not found', 'error'); return; }

    user.password = newPassword;
    saveUser(user);

    showAlert('Password reset successfully! Redirecting to login...', 'success');
    clearInterval(resetOtpTimerInterval);
    sessionStorage.removeItem('fitnesshub_reset_email');
    sessionStorage.removeItem('fitnesshub_reset_token');

    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
}

function goBackToForgotPassword() {
    clearInterval(resetOtpTimerInterval);
    const ff = document.getElementById('forgotPasswordForm');
    const rf = document.getElementById('resetOtpForm');
    const pf = document.getElementById('resetPasswordForm');
    if (ff) ff.style.display = 'block';
    if (rf) rf.style.display = 'none';
    if (pf) pf.style.display = 'none';

    const fe = document.getElementById('forgotEmail');
    const ri = document.getElementById('resetOtpInput');
    if (fe) fe.value = '';
    if (ri) ri.value = '';
}

// ============================================
// CLEAR REGISTRATION FORM
// ============================================

function clearRegistrationForm() {
    currentStep = 1;
    selectedPlan = null;
    userFormData = {};

    document.querySelectorAll('form').forEach(f => f.reset());
    document.querySelectorAll('.plan-option').forEach(el => el.classList.remove('selected'));

    const planInfo = document.getElementById('selectedPlanInfo');
    if (planInfo) planInfo.innerHTML = '';

    document.querySelectorAll('.form-step').forEach((el, idx) => {
        el.classList.toggle('active', idx === 0);
    });
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx === 0) el.classList.add('active');
    });
}

// ============================================
// PAYMENT (Simulated)
// ============================================

function setPaymentMethod(method) {
    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('active'));
    const btn = event?.target?.closest('.payment-method-btn');
    if (btn) btn.classList.add('active');
    sessionStorage.setItem('fitnesshub_payment_method', method);
}

function processPayment() {
    if (!validatePayment()) return;
    showPaymentProcessing();
    setTimeout(() => finalizePayment(), 1200);
}

function validatePayment() {
    const method = sessionStorage.getItem('fitnesshub_payment_method') || 'card';
    if (method === 'card') {
        const num  = document.getElementById('cardNumber')?.value.trim();
        const exp  = document.getElementById('cardExpiry')?.value.trim();
        const cvc  = document.getElementById('cardCVC')?.value.trim();
        const name = document.getElementById('cardName')?.value.trim();
        if (!num || num.length < 16) { showAlert('Please enter a valid card number', 'error'); return false; }
        if (!exp)  { showAlert('Please enter card expiry date', 'error'); return false; }
        if (!cvc || cvc.length < 3)  { showAlert('Please enter CVC', 'error'); return false; }
        if (!name) { showAlert('Please enter the cardholder name', 'error'); return false; }
    }
    return true;
}

function showPaymentProcessing() {
    const btn = document.querySelector('.btn-success, .btn-payment');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment...';
    }
}

function finalizePayment() {
    try {
        const sessionRaw = localStorage.getItem(KEY_SESSION);
        const session = sessionRaw ? JSON.parse(sessionRaw) : null;

        if (session?.email) {
            const user = findUser(session.email);
            if (user) {
                user.isPaid        = true;
                user.paymentStatus = 'completed'; // Matches admin dashboard verification
                user.paymentDate   = new Date().toISOString();
                user.transactionId = 'TXN_' + Date.now();
                saveUser(user);
            }
        }

        // Show success then redirect
        const container = document.querySelector('.payment-container, .container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:80px 20px; font-family:'Inter',sans-serif; color:#f0f2ff;">
                    <div style="font-size:80px; margin-bottom:24px; color:#00d464;">✅</div>
                    <h2 style="font-family:'Space Grotesk',sans-serif; font-size:36px; text-transform:uppercase; margin-bottom:16px;">Payment Successful!</h2>
                    <p style="color:#7a80a8; font-size:18px; margin-bottom:32px;">Welcome to Fitness Hub! Your membership is now active.</p>
                    <p style="color:#7a80a8; font-size:14px;">Redirecting to dashboard...</p>
                </div>`;
        }

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 2500);
    } catch (e) {
        console.error('Payment finalization error:', e);
        window.location.href = 'dashboard.html';
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAIWorkoutSuggestion(goal, experience) {
    const suggestions = {
        weight_loss: {
            beginner:     { workouts: ['30min Walking/Jogging', 'Swimming', 'Cycling'], diet: 'Low-calorie, high protein', frequency: '4–5×/week' },
            intermediate: { workouts: ['HIIT Training', 'CrossFit', 'Circuit Training'], diet: 'Balanced, calorie deficit', frequency: '5–6×/week' },
            advanced:     { workouts: ['Advanced HIIT', 'Strength + Cardio'], diet: 'Customized macros', frequency: '6–7×/week' }
        },
        muscle_gain: {
            beginner:     { workouts: ['Basic Strength Training', 'Free Weights'], diet: 'High protein, caloric surplus', frequency: '4×/week' },
            intermediate: { workouts: ['Progressive Overload', 'Hypertrophy Training'], diet: 'Macro cycling', frequency: '5×/week' },
            advanced:     { workouts: ['Advanced Periodization', 'Peak Performance'], diet: 'Optimized nutrition', frequency: '6×/week' }
        }
    };
    return suggestions[goal]?.[experience] || suggestions.weight_loss.beginner;
}

// ============================================
// CARD INPUT FORMATTING
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const cardNum = document.getElementById('cardNumber');
    if (cardNum) {
        cardNum.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
        });
    }

    const cardExp = document.getElementById('cardExpiry');
    if (cardExp) {
        cardExp.addEventListener('input', e => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
            e.target.value = v;
        });
    }

    const cardCVC = document.getElementById('cardCVC');
    if (cardCVC) {
        cardCVC.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
        });
    }

    // Register page: reset form on load
    if (window.location.pathname.includes('register.html')) {
        clearRegistrationForm();
        setTimeout(() => {
            document.querySelectorAll('input').forEach(i => { i.value = ''; });
            document.querySelectorAll('select').forEach(s => { s.selectedIndex = 0; });
            document.getElementById('fullName')?.focus();
        }, 50);
    }

    // Enter key submission on login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('keypress', e => {
            if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
        });
    }
});
