/**
 * FITNESS HUB - PREMIUM MEMBERSHIP HUB
 * Real-time synchronization with Supabase Backend.
 */

const membershipPlans = [
    {
        type: 'starter',
        emoji: '⚡',
        name: 'Starter Plan',
        price: 999,
        duration: 'Monthly',
        features: [
            'Access to Main Gym (6am-10pm)',
            'Standard Workout Schemes',
            'Progress Tracking App',
            'Community Support Groups'
        ]
    },
    {
        type: 'professional',
        emoji: '🔥',
        name: 'Pro Plan',
        price: 1999,
        duration: 'Monthly',
        features: [
            '24/7 Full Gym Access',
            'Personal Trainer (1x/week)',
            'Custom Diet Plans',
            'Performance Analytics',
            'VIP Locker Access'
        ],
        popular: true
    },
    {
        type: 'elite',
        emoji: '🔱',
        name: 'Elite Plan',
        price: 2999,
        duration: 'Monthly',
        features: [
            'God-Tier Support (24/7)',
            'Unlimited Personal Training',
            'Cryotherapy Access',
            'Monthly Blood Work Analysis',
            'All Supps 20% Discount'
        ]
    }
];

let selectedPlan = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('💎 Premium Membership Hub Initializing...');
    
    // 1. Check for valid session
    const session = localStorage.getItem('fitnesshub_session');
    if (!session) {
        console.warn('Unauthorized access attempt');
        window.location.href = 'login.html';
        return;
    }

    try {
        showLoader(true);
        // 2. Fetch/Validate profile from server
        const response = await apiGetProfile();
        
        if (response.success && response.user) {
            currentUser = response.user;
            // Persistence for payment page
            localStorage.setItem('fitnesshub_user', JSON.stringify(currentUser));
            
            // 3. Populate Identity UI
            updateIdentityUI(currentUser);
            
            // 4. Check for active membership to prevent duplicate purchases
            await fetchAndRenderPlans();
        } else {
            throw new Error(response.message || 'Verification Failed');
        }
    } catch (error) {
        console.error('Session Error:', error);
        // If server is unreachable but we have local user, still show something
        const localUser = JSON.parse(localStorage.getItem('fitnesshub_user'));
        if (localUser) {
            currentUser = localUser;
            updateIdentityUI(currentUser);
            renderPlanGrid(null);
        } else {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    } finally {
        showLoader(false);
    }
});

/**
 * Updates Top Profile Identity Bar
 */
function updateIdentityUI(user) {
    const nameEl = document.getElementById('displayName');
    const emailEl = document.getElementById('displayEmail');
    const statusEl = document.getElementById('displayStatus');

    if (nameEl) {
        const fname = user.firstName || user.first_name || '';
        const lname = user.lastName || user.last_name || '';
        nameEl.textContent = `${fname} ${lname}`.trim() || 'Active Member';
    }
    
    if (emailEl) emailEl.textContent = user.email || 'N/A';
    
    if (statusEl) {
        const status = (user.membership_status || 'inactive').toUpperCase();
        statusEl.textContent = status;
        statusEl.className = `profile-value ${status === 'ACTIVE' ? 'text-success' : 'text-warning'}`;
    }
}

/**
 * Fetches active status and renders grid
 */
async function fetchAndRenderPlans() {
    try {
        const email = currentUser.email;
        const response = await apiGetActiveMembership(email);
        
        let activePlanType = null;
        if (response.success && response.data && response.data.membership) {
            activePlanType = response.data.membership.plan_type || response.data.membership.type;
            console.log('Active plan detected:', activePlanType);
        }
        
        renderPlanGrid(activePlanType);
    } catch (err) {
        console.warn('Membership fetch error (using fallback):', err);
        renderPlanGrid(null);
    }
}

/**
 * Dynamic Card Generation
 */
function renderPlanGrid(activePlanType) {
    const grid = document.getElementById('membershipPlans');
    if (!grid) return;
    
    grid.innerHTML = '';

    membershipPlans.forEach(plan => {
        const isCurrent = plan.type.toLowerCase() === (activePlanType || '').toLowerCase();
        
        const card = document.createElement('div');
        card.className = `plan-card ${isCurrent ? 'active-plan' : ''}`;
        card.innerHTML = `
            ${plan.popular ? '<div style="position:absolute; top:20px; right:-35px; background:var(--accent-gradient); padding:5px 40px; transform:rotate(45deg); font-size:0.7rem; font-weight:900; letter-spacing:1px; box-shadow:0 5px 15px rgba(139, 92, 246, 0.3);">BEST CHOICE</div>' : ''}
            <span class="plan-icon">${plan.emoji}</span>
            <h3 class="plan-name">${plan.name}</h3>
            <div class="plan-price-wrapper">
                <span class="plan-currency">₹</span>
                <span class="plan-price">${plan.price}</span>
                <span class="plan-period">/ ${plan.duration}</span>
            </div>
            <ul class="features-list">
                ${plan.features.map(f => `<li class="feature-item"><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}
            </ul>
            ${isCurrent ? '<div class="text-success fw-bold text-center mt-3"><i class="fas fa-certificate"></i> YOUR ACTIVE PLAN</div>' : ''}
        `;

        if (!isCurrent) {
            card.onclick = () => selectPlan(plan, card);
        } else {
            card.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        }

        grid.appendChild(card);
    });
}

/**
 * Interaction Handling
 */
function selectPlan(plan, cardEl) {
    // UI Feedback
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');

    selectedPlan = plan;
    
    // Manage Buttons
    const btn = document.getElementById('proceedBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Get ${plan.name} Plan <i class="fas fa-arrow-right ms-2"></i>`;
    }
}

/**
 * Navigation to Payment
 */
function proceedToPayment() {
    if (!selectedPlan) return;

    // Cache selection for payment processor
    const user = JSON.parse(localStorage.getItem('fitnesshub_user')) || {};
    user.selectedPlan = { ...selectedPlan };
    localStorage.setItem('fitnesshub_user', JSON.stringify(user));

    showLoader(true);
    
    // Smooth transition
    setTimeout(() => {
        window.location.href = 'payment.html';
    }, 800);
}

/**
 * UI State Utilities
 */
function showLoader(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
        if (show) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.opacity = '1', 10);
        }
    }
}

