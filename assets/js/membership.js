// ============================================
// MEMBERSHIP SELECTION PAGE - LOGIC
// ============================================

const membershipPlans = [
    {
        type: 'starter',
        emoji: '🏃',
        name: 'Starter Plan',
        price: 999,
        duration: '1 Month',
        features: [
            'Gym Access (6am-10pm)',
            'Basic Workout Plans',
            'Progress Tracking',
            'Community Support'
        ]
    },
    {
        type: 'professional',
        emoji: '💪',
        name: 'Professional Plan',
        price: 1999,
        duration: '1 Month',
        features: [
            'Unlimited Gym Access',
            'Personal Trainer (1x/week)',
            'Customized Diet Plan',
            'Progress Analysis',
            'Priority Support'
        ]
    },
    {
        type: 'elite',
        emoji: '👑',
        name: 'Elite Plan',
        price: 2999,
        duration: '1 Month',
        features: [
            'Premium Gym Access',
            'Dedicated Personal Trainer',
            'Custom Diet & Nutrition',
            'Weekly Progress Calls',
            '24/7 Support',
            'Supplement Consultation'
        ]
    }
];

let selectedPlan = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏋️ Membership page loaded');
    
    // Validate session locally (offline-first)
    const sessionData = localStorage.getItem('fitnesshub_session');
    if (!sessionData) {
        console.log('⚠️ No session found - redirecting to login');
        localStorage.removeItem('fitnesshub_session');
        localStorage.removeItem('fitnesshub_user');
        window.location.href = 'login.html';
        return;
    }

    // Load user info
    loadUserInfo();

    // SELF-CORRECTION: Re-verify against primary database (fitnesshub_database)
    try {
        const session = JSON.parse(localStorage.getItem('fitnesshub_session'));
        if (session && session.email) {
            const userDb = JSON.parse(localStorage.getItem('fitnesshub_database') || '{}');
            const latestUserRecord = userDb[session.email.toLowerCase()];
            
            if (latestUserRecord) {
                const isActuallyPaid = latestUserRecord.isPaid === true || latestUserRecord.paymentStatus === 'completed' || latestUserRecord.paymentStatus === 'paid';
                
                if (isActuallyPaid) {
                    console.log('🔄 Self-correction: Found active membership in database. Updating session...');
                    localStorage.setItem('fitnesshub_user', JSON.stringify(latestUserRecord));
                    window.location.href = 'dashboard.html';
                    return;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ Self-correction check failed:', err);
    }
    
    // Load plans
    loadMembershipPlans();
});

// ============================================
// LOAD USER INFO
// ============================================

function loadUserInfo() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('displayName').textContent = userData.fullName || '-';
    document.getElementById('displayEmail').textContent = userData.email || '-';
    document.getElementById('displayPhone').textContent = userData.phone || '-';
    
    const ageGender = `${userData.age || '-'} | ${userData.gender || '-'}`;
    document.getElementById('displayAgeGender').textContent = ageGender;
}

function loadMembershipPlans() {
    const container = document.getElementById('membershipPlans');
    if (!container) return;
    container.innerHTML = '';

    const userData = JSON.parse(localStorage.getItem('fitnesshub_user')) || {};
    const currentUserPlan = userData.plan?.type || '';
    const isPaid = userData.isPaid === true || userData.paymentStatus === 'completed' || userData.paymentStatus === 'paid';
    const isNotExpired = userData.membershipEnd && new Date() < new Date(userData.membershipEnd);
    const activePlan = (isPaid && isNotExpired) ? currentUserPlan : null;

    membershipPlans.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        planCard.id = `plan-${plan.type}`;
        
        const isCurrentActive = plan.type === activePlan;
        if (isCurrentActive) {
            planCard.classList.add('current-active');
            planCard.style.cursor = 'default';
            planCard.style.opacity = '0.7';
            planCard.style.border = '2px solid #22d3ee';
        } else {
            planCard.style.cursor = 'pointer';
        }

        const featuresList = plan.features
            .map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`)
            .join('');

        planCard.innerHTML = `
            <span class="plan-emoji">${plan.emoji}</span>
            <div class="plan-name">${plan.name}</div>
            ${isCurrentActive ? '<div class="active-badge" style="background:#22d3ee; color:#0f172a; padding:2px 8px; border-radius:12px; font-size:0.7rem; margin-bottom:5px; display:inline-block; font-weight:bold;">YOUR CURRENT PLAN</div>' : ''}
            <div class="plan-price">₹${plan.price}</div>
            <div class="plan-duration">${plan.duration}</div>
            <ul class="plan-features">
                ${featuresList}
            </ul>
        `;

        if (!isCurrentActive) {
            planCard.addEventListener('click', () => selectPlan(plan));
        }
        container.appendChild(planCard);
    });
}

// ============================================
// SELECT PLAN
// ============================================

function selectPlan(plan) {
    // Remove previous selection
    document.querySelectorAll('.plan-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selection to clicked card
    document.getElementById(`plan-${plan.type}`).classList.add('selected');
    selectedPlan = plan;

    // Enable button
    document.getElementById('proceedBtn').disabled = false;

    console.log('✅ Plan selected:', plan.name);
}

// ============================================
// PROCEED TO PAYMENT
// ============================================

function proceedToPayment() {
    if (!selectedPlan) {
        alert('❌ Please select a membership plan first');
        return;
    }

    // Save selected plan to localStorage
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    userData.selectedPlan = {
        type: selectedPlan.type,
        name: selectedPlan.name,
        price: selectedPlan.price
    };

    localStorage.setItem('fitnesshub_user', JSON.stringify(userData));
    console.log('💾 Plan saved:', selectedPlan.name);

    // Show loading
    document.getElementById('loadingState').style.display = 'block';

    // Redirect to payment after 1 second
    setTimeout(() => {
        window.location.href = 'payment.html';
    }, 1000);
}

// ============================================
// LOGOUT / BACK
// ============================================

function logout(event) {
    if (event) event.preventDefault();
    console.log('🔄 Membership logout/back initiated...');
    if (confirm('⚠️ Are you sure you want to go back? Your plan selection will be cleared.')) {
        localStorage.removeItem('fitnesshub_session');
        localStorage.removeItem('fitnesshub_user');
        window.location.href = 'login.html';
    }
}
window.logout = logout;
