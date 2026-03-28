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

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏋️ Membership page loaded');
    loadUserInfo();
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

// ============================================
// LOAD MEMBERSHIP PLANS
// ============================================

function loadMembershipPlans() {
    const container = document.getElementById('membershipPlans');
    container.innerHTML = '';

    membershipPlans.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        planCard.id = `plan-${plan.type}`;
        planCard.style.cursor = 'pointer';

        const featuresList = plan.features
            .map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`)
            .join('');

        planCard.innerHTML = `
            <span class="plan-emoji">${plan.emoji}</span>
            <div class="plan-name">${plan.name}</div>
            <div class="plan-price">₹${plan.price}</div>
            <div class="plan-duration">${plan.duration}</div>
            <ul class="plan-features">
                ${featuresList}
            </ul>
        `;

        planCard.addEventListener('click', () => selectPlan(plan));
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
    event.preventDefault();
    if (confirm('⚠️ Are you sure you want to go back? Your plan selection will be cleared.')) {
        localStorage.removeItem('fitnesshub_session');
        localStorage.removeItem('fitnesshub_user');
        window.location.href = 'login.html';
    }
}
