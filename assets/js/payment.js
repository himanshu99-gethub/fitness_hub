// ============================================
// PAYMENT PAGE - LOGIC
// ============================================

let currentPaymentMethod = 'card';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('💳 Payment page loaded');
    
    // Validate session with server (for cross-device sync)
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    const sessionData = localStorage.getItem('fitnesshub_session');
    
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const serverStatus = await apiValidateSession(session.email);
            if (!serverStatus.isAuthenticated) {
                console.log('⚠️ Session expired - redirecting to login');
                localStorage.removeItem('fitnesshub_session');
                localStorage.removeItem('fitnesshub_user');
                window.location.href = 'login.html';
                return;
            }
        } catch (error) {
            console.error('Error validating session:', error);
        }
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
// PROCESS PAYMENT
// ============================================

function processPayment() {
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
    setTimeout(() => {
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

        // Sync to Firebase - REMOVED local database sync
        // TODO: Call Firebase API to sync payment
        console.log('✅ Payment synced to cache (Firebase integration needed);

// Rest of the function continues...
                    users[userIndex].paymentStatus = 'completed';
                    users[userIndex].paymentDate = userData.paymentDate;
                    users[userIndex].plan = userData.plan;
                    users[userIndex].phone = userData.phone;
                    users[userIndex].fullName = userData.fullName;
                    users[userIndex].age = userData.age;
                    users[userIndex].gender = userData.gender;
                    users[userIndex].email = userData.email;
                    localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users));
                    console.log('✅ User synced to admin list');
                }
            } catch (err) {
                console.log('⚠️ Error syncing payment:', err);
            }
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
