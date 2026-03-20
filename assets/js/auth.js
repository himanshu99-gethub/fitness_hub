// ============================================
// AUTHENTICATION & REGISTRATION FUNCTIONALITY
// ============================================

let currentStep = 1;
let selectedPlan = null;
let userFormData = {};
let otpTimerInterval = null;

// ============================================
// FORM NAVIGATION
// ============================================

function nextStep(step) {
    console.log(`🔄 nextStep called with step: ${step}`);
    
    const isValid = validateStep(step);
    console.log(`Validation result: ${isValid}`);
    
    if (isValid) {
        console.log(`✅ Validation passed for step ${step}`);
        saveStepData(step);
        
        if (step === 3) {
            // On Step 3, proceed directly to completion
            completeRegistration();
        } else {
            // Otherwise move to next step normally
            currentStep = step + 1;
            console.log(`📍 Moving to step ${currentStep}`);
            updateFormView();
        }
    } else {
        console.log(`❌ Validation failed for step ${step}`);
    }
}

function prevStep(step) {
    currentStep = step - 1;
    updateFormView();
}

function updateFormView() {
    console.log(`🎯 updateFormView called - showing step ${currentStep}`);
    
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(el => {
        el.classList.remove('active');
    });

    // Show current step
    const activeStep = document.getElementById(`step${currentStep}`);
    if (activeStep) {
        activeStep.classList.add('active');
        console.log(`✅ Step ${currentStep} activated`);
    } else {
        console.error(`❌ Step ${currentStep} not found!`);
    }

    // Update step indicator
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx + 1 === currentStep) {
            el.classList.add('active');
        } else if (idx + 1 < currentStep) {
            el.classList.add('completed');
        }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// VALIDATION
// ============================================

function validateStep(step) {
    switch (step) {
        case 1:
            return validatePersonalInfo();
        case 2:
            return validateFitnessProfile();
        case 3:
            return validatePlanSelection();
        default:
            return true;
    }
}

function validatePersonalInfo() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!fullName) {
        alert('Please enter your full name');
        return false;
    }

    if (!email || !isValidEmail(email)) {
        alert('Please enter a valid email');
        return false;
    }

    if (!phone || phone.length < 10) {
        alert('Please enter a valid phone number (at least 10 digits)');
        return false;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return false;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return false;
    }

    console.log('✅ Personal Info validation passed');
    return true;
}

function validateFitnessProfile() {
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const height = document.getElementById('height').value;
    const weight = document.getElementById('weight').value;
    const goal = document.getElementById('goal').value;
    const experience = document.getElementById('experience').value;

    if (!age || age < 13 || age > 120) {
        alert('Please enter a valid age (13-120)');
        return false;
    }

    if (!gender) {
        alert('Please select your gender');
        return false;
    }

    if (!height || height < 100 || height > 250) {
        alert('Please enter a valid height (100-250 cm)');
        return false;
    }

    if (!weight || weight < 20 || weight > 300) {
        alert('Please enter a valid weight (20-300 kg)');
        return false;
    }

    if (!goal) {
        alert('Please select your fitness goal');
        return false;
    }

    if (!experience) {
        alert('Please select your fitness level');
        return false;
    }

    return true;
}

function validatePlanSelection() {
    if (!selectedPlan) {
        alert('Please select a membership plan');
        return false;
    }
    return true;
}

// ============================================
// SAVE FORM DATA
// ============================================

function saveStepData(step) {
    switch (step) {
        case 1:
            userFormData.fullName = document.getElementById('fullName').value;
            userFormData.email = document.getElementById('email').value;
            userFormData.phone = document.getElementById('phone').value;
            userFormData.password = document.getElementById('password').value;
            break;
        case 2:
            userFormData.age = document.getElementById('age').value;
            userFormData.gender = document.getElementById('gender').value;
            userFormData.height = document.getElementById('height').value;
            userFormData.weight = document.getElementById('weight').value;
            userFormData.goal = document.getElementById('goal').value;
            userFormData.experience = document.getElementById('experience').value;
            break;
    }
}

// ============================================
// PLAN SELECTION
// ============================================

function selectPlan(planType, element) {
    const plans = {
        starter: { name: 'Starter Pack', price: 999 },
        professional: { name: 'Professional', price: 1999 },
        elite: { name: 'Elite Plus', price: 2999 }
    };

    selectedPlan = { type: planType, ...plans[planType] };

    // Remove selected class from all options
    document.querySelectorAll('.plan-option').forEach(el => {
        el.classList.remove('selected');
    });

    // Add selected class to clicked option
    element.classList.add('selected');

    // Update summary
    document.getElementById('selectedPlanInfo').innerHTML = `
        <strong>Selected Plan:</strong> ${selectedPlan.name} - ₹${selectedPlan.price}/month
    `;

    // Update payment summary
    document.getElementById('summaryPlan').textContent = `${selectedPlan.name} (Monthly)`;
    document.getElementById('summaryAmount').textContent = `₹${selectedPlan.price}`;
    document.getElementById('totalAmount').textContent = `₹${selectedPlan.price}`;
}

// ============================================
// PAYMENT PROCESSING
// ============================================

function setPaymentMethod(method) {
    alert(`Payment method selected: ${method.toUpperCase()}. This is a demo - actual integration would be done here.`);
}

function processPayment() {
    if (!validatePayment()) return;

    // Save payment data
    saveStepData(4);

    // Simulate payment processing
    showPaymentProcessing();

    // Fast redirect (500ms instead of 3sec)
    setTimeout(() => {
        completeRegistration();
    }, 500);
}

function showPaymentProcessing() {
    const btn = document.querySelector('.btn-success');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment...';
}

function completeRegistration() {
    console.log('🎉 Completing registration...');
    
    // Validate all required data is present
    if (!userFormData.fullName || !userFormData.email || !userFormData.phone || !userFormData.password) {
        alert('❌ Personal information incomplete');
        return;
    }
    
    if (!userFormData.age || !userFormData.gender || !userFormData.height || !userFormData.weight || !userFormData.goal || !userFormData.experience) {
        alert('❌ Please fill all fitness profile fields');
        return;
    }
    
    if (!selectedPlan) {
        alert('❌ Please select a membership plan');
        return;
    }
    
    console.log('✅ All data validated');
    
    // Create user record
    const userRecord = {
        fullName: userFormData.fullName,
        email: userFormData.email,
        phone: userFormData.phone,
        password: userFormData.password,
        age: parseInt(userFormData.age),
        gender: userFormData.gender,
        height: parseFloat(userFormData.height),
        weight: parseFloat(userFormData.weight),
        goal: userFormData.goal,
        experience: userFormData.experience,
        selectedPlan: {
            type: selectedPlan.type,
            name: selectedPlan.name,
            price: selectedPlan.price
        },
        registrationDate: new Date().toISOString(),
        profileCompleted: true,
        profileCompletedAt: new Date().toISOString(),
        isPaid: false,
        paymentStatus: 'pending',
        paymentDate: null
    };
    
    // Save to database (both localStorage and Supabase)
    saveUser(userRecord);
    
    // Also store in localStorage for compatibility
    localStorage.setItem('fitnesshub_user', JSON.stringify(userRecord));
    console.log('✅ User saved to localStorage');
    
    // Add to registered users list (for admin panel)
    let registeredUsers = [];
    const existingUsers = localStorage.getItem('fitnesshub_registered_users');
    
    if (existingUsers) {
        try {
            registeredUsers = JSON.parse(existingUsers);
        } catch (e) {
            registeredUsers = [];
        }
    }
    
    const emailExists = registeredUsers.some(u => u.email.toLowerCase() === userFormData.email.toLowerCase());
    
    if (!emailExists) {
        registeredUsers.push({
            email: userFormData.email,
            fullName: userFormData.fullName,
            phone: userFormData.phone,
            age: parseInt(userFormData.age),
            gender: userFormData.gender,
            height: parseFloat(userFormData.height),
            weight: parseFloat(userFormData.weight),
            goal: userFormData.goal,
            experience: userFormData.experience,
            registrationDate: new Date().toISOString(),
            plan: selectedPlan.type,
            isPaid: false,
            paymentStatus: 'pending',
            paymentDate: null
        });
        
        localStorage.setItem('fitnesshub_registered_users', JSON.stringify(registeredUsers));
        console.log('✅ Added to registered users list');
    }
    
    // Create session
    localStorage.setItem('fitnesshub_session', JSON.stringify({
        email: userFormData.email,
        loginTime: new Date().toISOString(),
        rememberMe: true,
        otpVerified: true,
        autoLogin: true
    }));
    
    console.log('✅ User registered successfully:', userFormData.email);
    
    // Show success step
    document.getElementById('successEmail').textContent = userFormData.email;
    document.getElementById('successPlan').textContent = selectedPlan.name;
    
    currentStep = 4;
    updateFormView();
    
    // Clear form
    clearRegistrationForm();
    
    // Redirect to payment page directly (plan already selected in registration Step 3)
    setTimeout(() => {
        window.location.replace('../pages/payment.html');
    }, 2000);
}

// ============================================
// CLEAR REGISTRATION FORM
// ============================================

function clearRegistrationForm() {
    // Clear JavaScript variables
    currentStep = 1;
    selectedPlan = null;
    userFormData = {};
    
    // Reset all HTML forms on the page
    document.querySelectorAll('form').forEach(form => {
        form.reset();
    });
    
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.value = '';
    });
    
    // Clear all plan selections
    document.querySelectorAll('.plan-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Clear plan info display
    const planInfo = document.getElementById('selectedPlanInfo');
    if (planInfo) planInfo.innerHTML = '';
    
    // Force show Step 1
    document.querySelectorAll('.form-step').forEach((el, idx) => {
        if (idx === 0) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    // Reset step indicators
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx === 0) {
            el.classList.add('active');
        }
    });
    
    console.log('✅ Registration form cleared - Step 1 shown');
}

// ============================================
// LOGIN FUNCTIONALITY WITH EMAIL OTP
// ============================================

// CHECK IF USER IS REGISTERED
function isUserRegistered(email) {
    try {
        // Check in Firebase (production)
        // OR check in localStorage (for demo/testing)
        
        // Demo: Check if user exists in localStorage registered users
        // In production, this would query Firestore/Firebase
        const registeredUsers = localStorage.getItem('fitnesshub_registered_users');
        
        if (!registeredUsers) {
            return false;
        }
        
        const users = JSON.parse(registeredUsers);
        const userExists = users.some(user => user.email.toLowerCase() === email.toLowerCase());
        
        return userExists;
    } catch (error) {
        console.error('Error checking registration:', error);
        return false;
    }
}

// ============================================
// PURE JAVASCRIPT - NO BACKEND REQUIRED
// ============================================
// All authentication handled client-side with localStorage

const DATABASE_KEY = 'fitnesshub_database';
const SESSION_KEY = 'fitnesshub_session';
const OTP_KEY = 'fitnesshub_otp';

// Initialize database if empty
function initializeDatabase() {
    if (!localStorage.getItem(DATABASE_KEY)) {
        localStorage.setItem(DATABASE_KEY, JSON.stringify({
            users: [],
            otps: [],
            sessions: []
        }));
    }
}

// Initialize on page load
initializeDatabase();

// ============================================
// PAGE LOAD - RESET FORM IF NEEDED
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Clear any stale registration data from previous sessions
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('register.html')) {
        console.log('📋 Register page loaded - resetting form to Step 1');
        
        // Set step to 1 first
        currentStep = 1;
        selectedPlan = null;
        userFormData = {};
        
        // Clear in small delay to ensure DOM is ready
        setTimeout(() => {
            // Force Step 1 to show FIRST
            document.querySelectorAll('.form-step').forEach((el, idx) => {
                if (idx === 0) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
            
            // Force step indicator to Step 1
            document.querySelectorAll('.step').forEach((el, idx) => {
                el.classList.remove('active', 'completed');
                if (idx === 0) {
                    el.classList.add('active');
                }
            });
            
            clearRegistrationForm();
            
            // Also clear temporary registration data from sessionStorage
            sessionStorage.removeItem('registration_step');
            sessionStorage.removeItem('temp_user_data');
            
            // Clear form data from localStorage used during registration
            localStorage.removeItem('current_registration_email');
            localStorage.removeItem('current_registration_password');
            
            // Force all inputs to be empty and disable autocomplete
            document.querySelectorAll('input').forEach(input => {
                input.value = '';
                input.autocomplete = 'off';
            });
            
            // Clear selects
            document.querySelectorAll('select').forEach(select => {
                select.value = '';
                select.selectedIndex = 0;
            });
            
            // Force focus on first field
            const firstField = document.getElementById('fullName');
            if (firstField) {
                firstField.focus();
                firstField.value = '';
            }
            
            console.log('✅ Form reset complete - Step 1 showing');
        }, 50);
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getDatabase() {
    const db = localStorage.getItem(DATABASE_KEY);
    return JSON.parse(db) || { users: [], otps: [], sessions: [] };
}

function saveDatabase(db) {
    localStorage.setItem(DATABASE_KEY, JSON.stringify(db));
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(email, otp) {
    const db = getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60000); // 10 minutes expiry
    
    // Remove old OTP for this email
    db.otps = db.otps.filter(o => o.email !== email);
    
    // Add new OTP
    db.otps.push({
        email: email,
        otp: otp,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        verified: false
    });
    
    saveDatabase(db);
}

function verifyOTPCode(email, otp) {
    const db = getDatabase();
    const otpRecord = db.otps.find(o => o.email === email);
    
    if (!otpRecord) {
        return { success: false, message: 'No OTP found. Please request a new one.' };
    }
    
    if (new Date(otpRecord.expiresAt) < new Date()) {
        return { success: false, message: 'OTP has expired. Please request a new one.' };
    }
    
    if (otpRecord.attempts >= 5) {
        return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }
    
    if (otpRecord.otp !== otp) {
        otpRecord.attempts++;
        saveDatabase(db);
        return { success: false, message: 'Invalid OTP. Please try again.' };
    }
    
    // OTP is correct
    otpRecord.verified = true;
    saveDatabase(db);
    return { success: true, message: 'OTP verified successfully' };
}

// Using hybrid approach - checks fitnesshub_database first, then falls back to fitnesshub_user
function findUser(email) {
    // First, check the main database
    const db = getDatabase();
    const user = db.users.find(u => u.email === email);
    if (user) return user;
    
    // Fallback: check if user is stored in fitnesshub_user
    const storedUser = localStorage.getItem('fitnesshub_user');
    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.email === email) {
                return parsedUser;
            }
        } catch (e) {
            console.error('Error parsing fitnesshub_user:', e);
        }
    }
    
    return null;
}

function saveUser(userData) {
    // Save to localStorage immediately (sync)
    const db = getDatabase();
    const existingUserIndex = db.users.findIndex(u => u.email === userData.email);
    
    if (existingUserIndex >= 0) {
        db.users[existingUserIndex] = { ...db.users[existingUserIndex], ...userData, updated_at: new Date().toISOString() };
    } else {
        db.users.push({
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    saveDatabase(db);
    console.log('✅ Saved to localStorage');
    
    // SUPABASE INTEGRATION - Save to cloud database
    if (typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        console.log('🌐 Syncing to Supabase...');
        addUser(userData)
            .then(result => {
                if (result) {
                    console.log('✅ Supabase sync successful:', result);
                } else {
                    console.warn('⚠️ Supabase sync returned no data');
                }
            })
            .catch(err => {
                console.error('❌ Supabase sync error (using localStorage as fallback):', err);
            });
    } else {
        console.log('ℹ️ Supabase not configured yet, using localStorage only');
    }
    
    return true;
}

// ============================================
// LOGIN FUNCTIONALITY
// ============================================

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !isValidEmail(email)) {
        showAlert('Please enter a valid email', 'error');
        return;
    }

    if (!password) {
        showAlert('Please enter your password', 'error');
        return;
    }

    // Check if user exists
    const user = findUser(email);
    if (!user) {
        showAlert('❌ This email is not registered. Please register first.', 'error');
        setTimeout(() => {
            const registerNow = confirm('Do you want to register now?');
            if (registerNow) {
                window.location.href = 'register.html';
            }
        }, 500);
        return;
    }

    // Verify password (simple comparison - in production, use hashed passwords)
    if (user.password !== password) {
        showAlert('❌ Incorrect password. Please try again.', 'error');
        return;
    }

    // Password correct - Create session and login immediately
    console.log('%c✅ Login successful for ' + email, 'color: #00ff41; font-size: 14px; font-weight: bold;');
    
    showAlert('✅ Login successful! Redirecting to dashboard...', 'success');
    
    // Create session
    setTimeout(() => {
        localStorage.setItem('fitnesshub_session', JSON.stringify({
            email: email,
            loginTime: new Date().toISOString(),
            rememberMe: rememberMe,
            otpVerified: true
        }));

        // Store user profile
        localStorage.setItem('fitnesshub_user', JSON.stringify(user));
        
        // No need to set fitness flag - profile completion is what matters

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    }, 1500);
}

function startOTPTimer() {
    let timeLeft = 600; // 10 minutes
    
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    
    otpTimerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        document.getElementById('otpTimer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimerInterval);
            showAlert('⏰ OTP Expired! Please request a new one', 'error');
            cancelOtpVerification();
        } else if (timeLeft === 60) {
            showAlert('⚠️ OTP expires in 1 minute', 'warning');
        }
    }, 1000);
}

function verifyOTP() {
    const enteredOTP = document.getElementById('otpInput').value.trim();
    
    if (!enteredOTP) {
        showAlert('Please enter the OTP', 'error');
        return;
    }

    if (enteredOTP.length !== 6) {
        showAlert('OTP must be 6 digits', 'error');
        return;
    }

    const email = sessionStorage.getItem('fitnesshub_temp_email');

    // Verify OTP locally
    const result = verifyOTPCode(email, enteredOTP);

    if (result.success) {
        showAlert('✅ OTP Verified! Logging in...', 'success');
        clearInterval(otpTimerInterval);
        
        setTimeout(() => {
            // Complete login
            const rememberMe = sessionStorage.getItem('fitnesshub_temp_remember') === 'true';

            localStorage.setItem('fitnesshub_session', JSON.stringify({
                email: email,
                loginTime: new Date().toISOString(),
                rememberMe: rememberMe,
                otpVerified: true
            }));

            // Clean up session storage
            sessionStorage.removeItem('fitnesshub_temp_otp');
            sessionStorage.removeItem('fitnesshub_temp_email');
            sessionStorage.removeItem('fitnesshub_temp_password');
            sessionStorage.removeItem('fitnesshub_temp_remember');

            window.location.href = 'dashboard.html';
        }, 1500);
    } else {
        showAlert('❌ ' + result.message, 'error');
        document.getElementById('otpInput').value = '';
        document.getElementById('otpInput').focus();
    }
}

function resendOTP() {
    const email = sessionStorage.getItem('fitnesshub_temp_email');
    
    // Generate new OTP
    const newOTP = generateOTP();
    storeOTP(email, newOTP);
    
    console.log('%c✅ New OTP Generated for ' + email, 'color: #00ff41; font-size: 14px; font-weight: bold;');
    console.log('%c📌 Your OTP: ' + newOTP, 'color: #00ff41; font-size: 16px; font-weight: bold; background: #1a1f3a; padding: 10px; border-radius: 5px;');
    
    showAlert('✅ New OTP sent to your email!', 'success');
    
    // Show OTP in popup
    setTimeout(() => {
        alert(`📧 Your New OTP Code:\n\n${newOTP}\n\n(Valid for 10 minutes)`);
    }, 300);
    
    // Clear input and focus
    document.getElementById('otpInput').value = '';
    document.getElementById('otpInput').focus();
    
    // Restart timer
    startOTPTimer();
}

function cancelOtpVerification() {
    clearInterval(otpTimerInterval);
    document.getElementById('otpVerificationForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('otpInput').value = '';
    
    sessionStorage.removeItem('fitnesshub_temp_otp');
    sessionStorage.removeItem('fitnesshub_temp_email');
    sessionStorage.removeItem('fitnesshub_temp_password');
    sessionStorage.removeItem('fitnesshub_temp_remember');
}

// ============================================
// FORGOT PASSWORD FUNCTIONALITY
// ============================================

function handleForgotPassword() {
    const email = document.getElementById('forgotEmail').value.trim();

    if (!email || !isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }

    // Check if email is registered
    if (!isUserRegistered(email)) {
        showAlert('❌ This email is not registered in our system. Please register first.', 'error');
        return;
    }

    // Generate and store password reset OTP
    const resetOTP = generateOTP();
    storeOTP(email, resetOTP);
    
    // Store email for reset flow
    sessionStorage.setItem('fitnesshub_reset_email', email);
    
    console.log('%c✅ Password Reset OTP Generated for ' + email, 'color: #00ff41; font-size: 14px; font-weight: bold;');
    console.log('%c📌 Recovery OTP: ' + resetOTP, 'color: #00ff41; font-size: 16px; font-weight: bold; background: #1a1f3a; padding: 10px; border-radius: 5px;');
    
    showAlert('✅ Recovery OTP sent to your email!', 'success');
    
    // Show OTP in popup
    setTimeout(() => {
        alert(`📧 Your Recovery OTP:\n\n${resetOTP}\n\n(Valid for 10 minutes)`);
    }, 300);

    // Show OTP verification form
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('resetOtpForm').style.display = 'block';
    document.getElementById('resetOtpEmail').textContent = `OTP sent to: ${email}`;
    document.getElementById('resetOtpInput').focus();
    startResetOTPTimer();
}

function startResetOTPTimer() {
    let timeLeft = 300;
    const timerElement = document.getElementById('resetOtpTimer');
    
    if (resetOtpTimerInterval) clearInterval(resetOtpTimerInterval);
    
    resetOtpTimerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(resetOtpTimerInterval);
            showAlert('Recovery OTP Expired! Please try again', 'error');
            goBackToForgotPassword();
        } else if (timeLeft === 60) {
            showAlert('⚠️ OTP expires in 1 minute', 'warning');
        }
    }, 1000);
}

function verifyResetOTP() {
    const otp = document.getElementById('resetOtpInput').value.trim();
    const email = sessionStorage.getItem('fitnesshub_reset_email');

    if (!otp || otp.length !== 6) {
        showAlert('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    // Verify OTP locally
    const result = verifyOTPCode(email, otp);

    if (result.success) {
        showAlert('✅ OTP Verified! Enter your new password', 'success');
        clearInterval(resetOtpTimerInterval);
        
        // Store reset token
        sessionStorage.setItem('fitnesshub_reset_token', otp);
        
        setTimeout(() => {
            document.getElementById('resetOtpForm').style.display = 'none';
            document.getElementById('resetPasswordForm').style.display = 'block';
            document.getElementById('newPassword').focus();
        }, 1000);
    } else {
        showAlert('❌ ' + result.message, 'error');
        document.getElementById('resetOtpInput').value = '';
        document.getElementById('resetOtpInput').focus();
    }
}

function resendResetOTP() {
    const email = sessionStorage.getItem('fitnesshub_reset_email');
    
    // Generate new OTP
    const newOTP = generateOTP();
    storeOTP(email, newOTP);
    
    console.log('%c✅ New Recovery OTP Generated for ' + email, 'color: #00ff41; font-size: 14px; font-weight: bold;');
    console.log('%c📌 Recovery OTP: ' + newOTP, 'color: #00ff41; font-size: 16px; font-weight: bold; background: #1a1f3a; padding: 10px; border-radius: 5px;');
    
    showAlert('✅ New OTP sent!', 'success');
    
    // Show OTP in popup
    setTimeout(() => {
        alert(`📧 Your New Recovery OTP:\n\n${newOTP}\n\n(Valid for 10 minutes)`);
    }, 300);
    
    document.getElementById('resetOtpInput').value = '';
    document.getElementById('resetOtpInput').focus();
    startResetOTPTimer();
}

function resetPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const email = sessionStorage.getItem('fitnesshub_reset_email');

    if (!newPassword || newPassword.length < 8) {
        showAlert('Password must be at least 8 characters', 'error');
        return;
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        showAlert('Password must contain letters and numbers', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    // Update password locally
    const user = findUser(email);
    if (user) {
        // Update user's password
        user.password = newPassword;
        saveUser(user);
        
        showAlert('✅ Password reset successfully! Redirecting to login...', 'success');
        clearInterval(resetOtpTimerInterval);
        
        // Clear session
        sessionStorage.removeItem('fitnesshub_reset_email');
        sessionStorage.removeItem('fitnesshub_reset_token');
        
        console.log('✅ Password updated for user:', email);
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } else {
        showAlert('❌ User not found', 'error');
    }
}

function goBackToForgotPassword() {
    clearInterval(resetOtpTimerInterval);
    document.getElementById('forgotPasswordForm').style.display = 'block';
    document.getElementById('resetOtpForm').style.display = 'none';
    document.getElementById('resetPasswordForm').style.display = 'none';
    document.getElementById('forgotEmail').value = '';
    document.getElementById('resetOtpInput').value = '';
}

// Global variable for reset OTP timer
let resetOtpTimerInterval = null;

// ============================================
// EMAIL OTP SERVICE
// ============================================

// Send OTP via Email using Firebase Cloud Function or Backend Service
async function sendOTPEmail(email, otp) {
    try {
        // Option 1: Using Firebase Cloud Function
        const response = await fetch('https://YOUR-FIREBASE-PROJECT.cloudfunctions.net/sendOTP', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                otp: otp
            })
        });
        
        if (response.ok) {
            console.log('✅ OTP sent successfully via email');
            return true;
        }
    } catch (error) {
        console.log('Email service not configured. OTP shown in console for demo.');
    }
    
    return false;
}

// Firebase Cloud Function for Email Sending
// Create this in Firebase Console → Cloud Functions
/*
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
    }
});

exports.sendOTP = functions.https.onRequest((req, res) => {
    cors()(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { email, otp } = req.body;

        const mailOptions = {
            from: 'Fitness Hub <noreply@fitnesshub.com>',
            to: email,
            subject: 'Your Fitness Hub Login OTP',
            html: `
                <h2>Welcome to Fitness Hub!</h2>
                <p>Your One-Time Password (OTP) is:</p>
                <h1 style="color: #00ff41; font-size: 48px; letter-spacing: 5px;">${otp}</h1>
                <p>This OTP is valid for 5 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Fitness Hub Team</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ message: 'OTP sent successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});
*/

// ============================================
// UTILITY FUNCTIONS
// ============================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Format card number input
document.addEventListener('DOMContentLoaded', () => {
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\s/g, '').slice(0, 16);
        });
    }

    const cardExpiryInput = document.getElementById('cardExpiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }

    const cardCVCInput = document.getElementById('cardCVC');
    if (cardCVCInput) {
        cardCVCInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
        });
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    
    // Map type to alert class
    const alertClass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : `alert-${type}`;
    alertDiv.className = `alert ${alertClass}`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `${message}`;
    
    // Try to find the appropriate container based on current form
    let container = null;
    
    // Check if OTP form is active
    const otpForm = document.getElementById('otpVerificationForm');
    if (otpForm && otpForm.style.display !== 'none') {
        container = document.getElementById('otpAlertContainer');
    } else {
        container = document.getElementById('alertContainer');
    }
    
    // Fallback to old method if not found
    if (!container) {
        container = document.querySelector('.container');
    }
    if (!container) {
        container = document.querySelector('.auth-container');
    }
    if (!container) {
        container = document.body;
    }
    
    // Clear previous alerts if inserting into container
    if (container.id === 'alertContainer' || container.id === 'otpAlertContainer') {
        container.innerHTML = '';
    }
    
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-remove after 5 seconds if not in a specific alert container
    if (container.id !== 'alertContainer' && container.id !== 'otpAlertContainer') {
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// ============================================
// AI-POWERED FEATURES
// ============================================

function getAIWorkoutSuggestion(goal, experience, weight, height) {
    const suggestions = {
        weight_loss: {
            beginner: {
                workouts: ['30min Walking/Jogging', 'Swimming', 'Cycling'],
                diet: 'Low-calorie diet with high protein',
                frequency: '4-5 times per week'
            },
            intermediate: {
                workouts: ['HIIT Training', 'CrossFit', 'Circuit Training'],
                diet: 'Balanced diet with calorie deficit',
                frequency: '5-6 times per week'
            },
            advanced: {
                workouts: ['Advanced HIIT', 'Strength + Cardio Combo', 'Customize regimen'],
                diet: 'Customized macro diet plan',
                frequency: '6-7 times per week'
            }
        },
        muscle_gain: {
            beginner: {
                workouts: ['Basic Strength Training', 'Free Weights', 'Machine Training'],
                diet: 'High protein, caloric surplus',
                frequency: '4 times per week'
            },
            intermediate: {
                workouts: ['Progressive Overload', 'Hypertrophy Training', 'Periodization'],
                diet: 'Advanced macro cycling',
                frequency: '5 times per week'
            },
            advanced: {
                workouts: ['Advanced Periodization', 'Specialized Programs', 'Peak Performance'],
                diet: 'Optimized nutrition plan',
                frequency: '6 times per week'
            }
        }
    };

    return suggestions[goal]?.[experience] || suggestions.general_fitness.beginner;
}

// ============================================
// FIREBASE INTEGRATION TEMPLATE
// ============================================

/*
// Initialize Firebase (add your config)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Register user function (Firebase)
async function registerUserFirebase(userData) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(
            userData.email,
            userData.password
        );

        // Save additional user data to Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.phone,
            age: userData.age,
            gender: userData.gender,
            height: userData.height,
            weight: userData.weight,
            goal: userData.goal,
            experience: userData.experience,
            plan: selectedPlan,
            createdAt: new Date(),
            stripeCustomerId: null
        });

        return userCredential.user.uid;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Login user function (Firebase)
async function loginUserFirebase(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}
*/

// ============================================
// RAZORPAY/STRIPE PAYMENT INTEGRATION TEMPLATE
// ============================================

/*
// Razorpay Integration
function processPaymentWithRazorpay() {
    const options = {
        key: 'YOUR_RAZORPAY_KEY',
        amount: selectedPlan.price * 100, // Amount in paise
        currency: 'INR',
        name: 'Fitness Hub',
        description: `${selectedPlan.name} Membership`,
        prefill: {
            name: userFormData.fullName,
            email: userFormData.email,
            contact: userFormData.phone
        },
        handler: function(response) {
            // Payment successful
            verifyPayment(response.razorpay_payment_id);
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}

// Stripe Integration
function processPaymentWithStripe() {
    const stripe = Stripe('YOUR_STRIPE_PUBLIC_KEY');
    const elements = stripe.elements();
    const cardElement = elements.create('card');

    // Create payment method and process
    stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
            name: userFormData.fullName,
            email: userFormData.email
        }
    }).then(function(result) {
        if (result.paymentMethod) {
            completeStripePayment(result.paymentMethod.id);
        }
    });
}
*/
