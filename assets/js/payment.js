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
    const form = document.getElementById('paymentForm');
    const loader = document.getElementById('loadingPayment');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> PROCESSING...';
    }
    if (form) form.style.display = 'none';
    if (loader) loader.style.display = 'block';

    try {
        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Use api-client activate instead of local fetch
        const activationData = {
            userId: currentUser.id,
            membershipId: currentPlan.id
        };

        if (!activationData.membershipId) {
             // Second attempt if ID was somehow missed (like when currentPlan is the static plan data)
             const memFetch = await apiGetLatestMembership(currentUser.email);
             if (memFetch.success && memFetch.data && memFetch.data.membership) {
                 activationData.membershipId = memFetch.data.membership.id;
             }
        }

        if (!activationData.userId || !activationData.membershipId) {
            throw new Error('Unable to identify user or membership for activation. Try refreshing.');
        }

        const response = await apiActivateMembership(activationData);

        if (response.success) {
            // Also update local storage if needed
            currentUser.membership_status = 'active';
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showSuccessState();
            localStorage.removeItem('fitnesshub_selected_plan');
        } else {
            throw new Error(response.error || 'Payment Activation Failed');
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

function showSuccessState() {
    const loader = document.getElementById('loadingPayment');
    if (loader) {
        loader.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="mb-4" style="font-size: 60px; color: var(--accent-color);">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2 class="mb-3">PAYMENT SUCCESSFUL!</h2>
                <p class="mb-4">Welcome to Fitness Hub! Your membership is now ACTIVE.</p>
                <a href="dashboard.html" class="btn btn-primary px-5 py-3">
                    GO TO DASHBOARD <i class="fas fa-arrow-right ms-2"></i>
                </a>
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
