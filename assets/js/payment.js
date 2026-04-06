// ============================================
// PAYMENT PAGE - LOGIC
// ============================================

let currentPaymentMethod = 'card';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('💳 Payment page loaded');
    
    // Validate session locally (offline-first)
    const sessionData = localStorage.getItem('fitnesshub_session');
    if (!sessionData) {
        console.log('⚠️ No session found - redirecting to login');
        localStorage.removeItem('fitnesshub_session');
        localStorage.removeItem('fitnesshub_user');
        window.location.href = 'login.html';
        return;
    }

    // HARD BLOCK: If any completed payment exists, redirect to dashboard
    try {
        const history = JSON.parse(localStorage.getItem('fitnesshub_payment_history') || '[]');
        const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
        const hasAnyPaidPlan = history.some(p => (p.status === 'completed' || p.status === 'paid') && (p.email === userData.email || !p.email));
        
        if (hasAnyPaidPlan) {
            console.log('✅ Found completed payment in history - blocking repeat purchase');
            alert('Your payment for ' + (userData.plan?.name || 'this membership') + ' is already COMPLETED. Redirecting to your dashboard.');
            window.location.href = 'dashboard.html';
            return;
        }
    } catch (e) {
        console.warn('History block check failed:', e);
    }
    
    loadPaymentSummary();
    setupCardFormatting();
});

// ============================================
// LOAD PAYMENT SUMMARY
// ============================================

function loadPaymentSummary() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    
    if (!userData || !userData.selectedPlan) {
        console.error('❌ No plan selected');
        window.location.href = 'membership.html';
        return;
    }

    document.getElementById('summaryPlanName').textContent = userData.selectedPlan.name;
    document.getElementById('summaryAmount').textContent = `₹${userData.selectedPlan.price}`;

    console.log('📋 Payment summary loaded:', userData.selectedPlan.name);
}

// ============================================
// SWITCH PAYMENT METHOD
// ============================================

function switchPaymentMethod(method) {
    currentPaymentMethod = method;

    // Update button styles
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-method="${method}"]`).classList.add('active');

    // Hide all method contents
    document.querySelectorAll('.payment-methods-content').forEach(content => {
        content.classList.remove('active');
    });

    // Show selected method
    document.getElementById(`${method}-method`).classList.add('active');

    console.log('💳 Payment method switched to:', method);
}

// ============================================
// CARD FORMATTING
// ============================================

function setupCardFormatting() {
    const cardInput = document.getElementById('cardNumber');
    const expiryInput = document.getElementById('cardExpiry');
    const cvvInput = document.getElementById('cardCVV');

    // Format card number with spaces
    cardInput.addEventListener('input', function() {
        let value = this.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        this.value = formattedValue;
    });

    // Format expiry date
    expiryInput.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        this.value = value;
    });

    // Format CVV (numbers only)
    cvvInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 3);
    });
}

// ============================================
// VALIDATE PAYMENT FORM
// ============================================

function validatePaymentForm() {
    if (currentPaymentMethod === 'card') {
        const name = document.getElementById('cardName').value.trim();
        const number = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const expiry = document.getElementById('cardExpiry').value.trim();
        const cvv = document.getElementById('cardCVV').value.trim();

        if (!name) {
            alert('❌ Please enter cardholder name');
            return false;
        }

        if (!number || number.length < 16) {
            alert('❌ Please enter a valid card number');
            return false;
        }

        if (!expiry || expiry.length < 5) {
            alert('❌ Please enter valid expiry date (MM/YY)');
            return false;
        }

        if (!cvv || cvv.length < 3) {
            alert('❌ Please enter valid CVV');
            return false;
        }

        return true;
    } else if (currentPaymentMethod === 'upi') {
        const upiId = document.getElementById('upiId').value.trim();

        if (!upiId) {
            alert('❌ Please enter UPI ID');
            return false;
        }

        if (!upiId.includes('@')) {
            alert('❌ Please enter valid UPI ID (e.g., user@upi)');
            return false;
        }

        return true;
    } else if (currentPaymentMethod === 'netbanking') {
        const bank = document.getElementById('bankSelect').value;

        if (!bank) {
            alert('❌ Please select a bank');
            return false;
        }

        return true;
    }

    return false;
}

// ============================================
// PROCESS PAYMENT (Asynchronous)
// ============================================

async function processPayment() {
    // Validate form
    if (!validatePaymentForm()) {
        return;
    }

    // Show loading state
    document.getElementById('paymentForm').style.display = 'none';
    document.getElementById('loadingPayment').style.display = 'block';

    // Get user data
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));

    // Simulate payment processing (2 seconds delay)
    setTimeout(async () => {
        // Mark payment as complete
        userData.paymentStatus = 'completed';
        userData.isPaid = true;
        userData.paymentDate = new Date().toISOString();
        userData.plan = userData.selectedPlan;

        // Store payment history
        let paymentHistory = JSON.parse(localStorage.getItem('fitnesshub_payment_history') || '[]');
        paymentHistory.push({
            date: userData.paymentDate,
            planName: userData.plan.name,
            planType: userData.plan.type,
            amount: userData.plan.price,
            status: 'completed',
            method: currentPaymentMethod
        });
        localStorage.setItem('fitnesshub_payment_history', JSON.stringify(paymentHistory));

        // Save updated user data
        localStorage.setItem('fitnesshub_user', JSON.stringify(userData));

        // Sync with primary object database (fitnesshub_database)
        try {
            const userDb = JSON.parse(localStorage.getItem('fitnesshub_database') || '{}');
            if (userData.email && userDb[userData.email.toLowerCase()]) {
                const currentUserRecord = userDb[userData.email.toLowerCase()];
                userDb[userData.email.toLowerCase()] = {
                    ...currentUserRecord,
                    isPaid: true,
                    paymentStatus: 'completed',
                    paymentDate: userData.paymentDate,
                    plan: userData.plan
                };
                localStorage.setItem('fitnesshub_database', JSON.stringify(userDb));
                console.log('✅ Synchronized payment with primary database');
            }
        } catch (dbErr) {
            console.warn('⚠️ Error syncing with primary database:', dbErr);
        }

        // Sync payment to backend via API
        try {
            console.log('🔄 Syncing payment for:', userData.email);
            // Call API to complete payment/membership
            const result = await apiCreateMembership(userData.email, userData.plan.name, userData.plan.price);
            
            if (result.success) {
                console.log('✅ Payment completed and synced to backend');
            } else {
                console.log('⚠️ Backend sync failed (local payment saved):', result.error);
            }

            // Sync with registered users list locally (for admin panel support)
            try {
                const users = JSON.parse(localStorage.getItem('fitnesshub_registered_users') || '[]');
                const userIndex = users.findIndex(u => u.email && u.email.toLowerCase() === userData.email.toLowerCase());
                
                if (userIndex !== -1) {
                    users[userIndex].paymentStatus = 'completed';
                    users[userIndex].paymentDate = userData.paymentDate;
                    users[userIndex].isPaid = true;
                    users[userIndex].plan = userData.plan.type;
                    localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users));
                    console.log('✅ User synced to admin list');
                }
            } catch (syncErr) {
                console.warn('⚠️ Admin list sync error:', syncErr);
            }

        } catch (apiErr) {
            console.error('❌ API sync failed:', apiErr);
        }

        console.log('✅ Payment completed successfully');
        console.log('💾 Redirecting to dashboard...');

        // Show success message
        const loadingDiv = document.getElementById('loadingPayment');
        const successHtml = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 60px; color: #28a745; margin-bottom: 20px;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 style="color: #333; margin-bottom: 10px;">Payment Successful! 🎉</h3>
                <p style="color: #999; margin-bottom: 10px;">Your membership is now active</p>
                <p style="color: #666; font-size: 0.9rem;">Redirecting to dashboard...</p>
            </div>
        `;
        loadingDiv.innerHTML = successHtml;

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    }, 2000); // Simulate 2 second processing
}

// ============================================
// GO BACK TO MEMBERSHIP
// ============================================

function goBackToMembership() {
    if (confirm('⚠️ Are you sure? Your plan will remain selected.')) {
        window.location.href = 'membership.html';
    }
}
