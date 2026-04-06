// ============================================
// PAYMENT PAGE - LOGIC
// ============================================

let currentUser = null;
let currentPlan = null;
let currentPaymentMethod = 'card';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('💳 Payment Processor Initializing...');
    
    // 1. Check Session
    const session = localStorage.getItem('fitnesshub_session');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    try {
        showLoader(true);
        // 2. Fetch Fresh Profile
        const response = await apiGetProfile();
        
        if (response.success && response.user) {
            currentUser = response.user;
            
            // 3. Get Selected Plan from temp storage or Server
            let savedPlan = localStorage.getItem('fitnesshub_selected_plan');
            if (!savedPlan) {
                console.log('🔄 No plan in local storage, checking server for pending membership...');
                const memResponse = await apiGetLatestMembership(currentUser.email);
                if (memResponse.success && memResponse.data && memResponse.data.membership) {
                    const mem = memResponse.data.membership;
                    currentPlan = {
                        id: mem.id,
                        name: mem.plan_name,
                        price: mem.price,
                        type: mem.plan_type
                    };
                } else {
                    console.warn('No plan selected and no pending membership on server');
                    window.location.href = 'membership.html';
                    return;
                }
            } else {
                currentPlan = JSON.parse(savedPlan);
            }
            
            // 4. Populate UI
            loadPaymentSummary(currentUser, currentPlan);
            setupEventListeners();
            setupCardFormatting();
        } else {
            throw new Error(response.message || 'Profile retrieval failed');
        }
    } catch (err) {
        console.error('Payment Init Error:', err);
        window.location.href = 'dashboard.html';
    } finally {
        showLoader(false);
    }
});

/**
 * Populate Summary Section
 */
function loadPaymentSummary(user, plan) {
    const planName = document.getElementById('summaryPlanName') || document.getElementById('planName');
    const planPrice = document.getElementById('summaryAmount') || document.getElementById('planPrice');
    const totalAmount = document.getElementById('totalAmount');
    const userEmailText = document.getElementById('userEmailText');

    if (planName) planName.textContent = plan.name || 'Pro Plan';
    if (planPrice) planPrice.textContent = `₹ ${plan.price || '0'}`;
    if (totalAmount) totalAmount.textContent = `₹ ${plan.price || '0'}`;
    if (userEmailText) userEmailText.textContent = user.email || 'N/A';
}

function setupEventListeners() {
    const payBtn = document.getElementById('processPaymentBtn');
    if (payBtn) {
        payBtn.addEventListener('click', processPayment);
    }

    // Back Button logic
    const backBtn = document.getElementById('backToPlansBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
             window.location.href = 'membership.html';
        });
    }
}

/**
 * Switch between card, upi, netbanking
 */
function switchPaymentMethod(method) {
    currentPaymentMethod = method;

    // Update button styles
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-method="${method}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Hide all method contents
    document.querySelectorAll('.payment-methods-content').forEach(content => {
        content.classList.remove('active');
    });

    // Show selected method
    const target = document.getElementById(`${method}-method`);
    if (target) target.classList.add('active');
}

function setupCardFormatting() {
    const cardInput = document.getElementById('cardNumber');
    const expiryInput = document.getElementById('cardExpiry');
    const cvvInput = document.getElementById('cardCVV');

    if (cardInput) {
        cardInput.addEventListener('input', function() {
            let value = this.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = '';
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) formattedValue += ' ';
                formattedValue += value[i];
            }
            this.value = formattedValue;
        });
    }

    if (expiryInput) {
        expiryInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2, 4);
            this.value = value;
        });
    }

    if (cvvInput) {
        cvvInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 3);
        });
    }
}

function validatePaymentForm() {
    if (currentPaymentMethod === 'card') {
        const name = document.getElementById('cardName')?.value.trim();
        const number = document.getElementById('cardNumber')?.value.replace(/\s/g, '');
        const expiry = document.getElementById('cardExpiry')?.value.trim();
        const cvv = document.getElementById('cardCVV')?.value.trim();

        if (!name) { alert('❌ Please enter cardholder name'); return false; }
        if (!number || number.length < 16) { alert('❌ Please enter a valid card number'); return false; }
        if (!expiry || expiry.length < 5) { alert('❌ Please enter valid expiry date (MM/YY)'); return false; }
        if (!cvv || cvv.length < 3) { alert('❌ Please enter valid CVV'); return false; }
        return true;
    } else if (currentPaymentMethod === 'upi') {
        const upiId = document.getElementById('upiId')?.value.trim();
        if (!upiId || !upiId.includes('@')) { alert('❌ Please enter valid UPI ID'); return false; }
        return true;
    } else if (currentPaymentMethod === 'netbanking') {
        const bank = document.getElementById('bankSelect')?.value;
        if (!bank) { alert('❌ Please select a bank'); return false; }
        return true;
    }
    return false;
}

/**
 * Main Payment Transaction Block
 */
async function processPayment(e) {
    if (e) e.preventDefault();
    if (!validatePaymentForm()) return;
    
    const btn = document.getElementById('processPaymentBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> PROCESSING...';
    }

    const form = document.getElementById('paymentForm');
    const loader = document.getElementById('loadingPayment');
    if (form) form.style.display = 'none';
    if (loader) loader.style.display = 'block';

    try {
        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Gather correct activation payload
        const activationData = {
            userId: currentUser.id,
            membershipId: currentPlan.id || currentUser.currentMembershipId
        };

        if (!activationData.membershipId) {
            // Re-fetch latest membership to get the ID if it's missing
            const memResponse = await apiGetLatestMembership(currentUser.email);
            if (memResponse.success && memResponse.data && memResponse.data.membership) {
                activationData.membershipId = memResponse.data.membership.id;
            }
        }

        if (!activationData.userId || !activationData.membershipId) {
            throw new Error('Unable to identify user or membership for activation.');
        }

        const response = await apiProcessPayment(activationData);

        if (response.success) {
            showSuccessState();
            localStorage.removeItem('fitnesshub_selected_plan');
        } else {
            throw new Error(response.message || 'Payment Activation Failed');
        }
    } catch (err) {
        console.error('Transaction Failed:', err);
        alert('Transaction Failed: ' + err.message);
        if (form) form.style.display = 'block';
        if (loader) loader.style.display = 'none';
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'PURCHASE MEMBERSHIP';
        }
    }
}

async function apiProcessPayment(data) {
    try {
        const res = await fetch('/api/membership/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: 'Server Connection Error' };
    }
}

function showSuccessState() {
    const loader = document.getElementById('loadingPayment');
    if (loader) {
        loader.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 60px; color: #10b981; margin-bottom: 20px;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 style="color: #fff; margin-bottom: 10px;">Payment Successful! 🎉</h3>
                <p style="color: #cbd5e1; margin-bottom: 20px;">Your membership is now active.</p>
                <div style="padding: 15px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 25px;">
                    <span style="display: block; color: #84cc16; font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">Transaction ID</span>
                    <span style="color: #fff; font-family: monospace;">${Math.random().toString(36).substr(2, 12).toUpperCase()}</span>
                </div>
                <p style="color: #94a3b8; font-size: 0.9rem;">Redirecting to your dashboard in 3 seconds...</p>
            </div>
        `;
    }
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 3000);
}

function showLoader(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}
