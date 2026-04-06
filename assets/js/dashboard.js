// ============================================
// DASHBOARD FUNCTIONALITY - PROFESSIONAL & MODERN
// ============================================

let currentTheme = 'dark'; // 'dark' or 'light'

// ============ UTILITY FUNCTIONS ============

/**
 * Format date to readable format
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Global dashboard state
window.dashboardState = {
    userProfile: null,
    userAssignments: {},
    fitnessCompleted: false,
    isInitialized: false
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Initializing dashboard...');
        
        // Check for session locally (offline-first)
        const session = localStorage.getItem('fitnesshub_session');
        const userData = JSON.parse(localStorage.getItem('fitnesshub_user') || 'null');
        
        if (!session || !userData) {
            console.log('❌ No valid local session found - redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        console.log('✅ Local session validated');
        
        // Initialize theme
        // initTheme(); (Removed for Kinetic Brutalism)
        
        // Load all user data
        await loadUserData();
        
        // Load admin assignments
        await loadAdminAssignments();
        
        // Check profile completion status
        setTimeout(() => {
            const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
            
            // If payment not complete, redirect to membership page
            // We prioritize membership_status which is synced from server in loadUserData()
            const isPaid = userData && (
                userData.membership_status === 'active' || 
                userData.isPaid === true || 
                userData.paymentStatus === 'completed' || 
                userData.paymentStatus === 'paid'
            );
            
            if (!isPaid) {
                console.log('⚠️ Payment not complete (Status: ' + (userData?.membership_status || 'none') + ') - redirecting to membership page');
                window.location.href = 'membership.html';
                return;
            }

            // Payment complete - show dashboard
            console.log('✅ Payment complete - showing dashboard');
            checkProfileCompletion();
            loadPaymentHistory();
        }, 200);
        
        // Initialize charts
        setTimeout(() => {
            initWeightChart();
        }, 300);
        
        // Load dashboard data
        loadDashboardData();
        
        window.dashboardState.isInitialized = true;
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        alert('Error loading dashboard. Please refresh the page.');
    }
});

// ============================================
// THEME SWITCHING (Removed for Kinetic Brutalism)
// ============================================

// ============================================
// LOAD USER DATA
// ============================================

async function loadUserData() {
    try {
        const sessionData = localStorage.getItem('fitnesshub_session');

        if (!sessionData) {
            window.location.href = 'login.html';
            return;
        }

        const session = JSON.parse(sessionData);
        const userEmail = session.email;
        
        // SYNC WITH SERVER DATABASE (Supabase)
        console.log('🔄 Fetching user data from Supabase...');
        try {
            const profileResponse = await apiGetProfile(userEmail);
            if (profileResponse.success && profileResponse.user) {
                const serverUser = profileResponse.user;
                
                // Determine membership status from server data
                const membershipResponse = await apiGetActiveMembership(userEmail);
                if (membershipResponse.success && membershipResponse.data && membershipResponse.data.membership) {
                    serverUser.membership_status = membershipResponse.data.membership.status;
                    serverUser.currentMembershipId = membershipResponse.data.membership.id;
                    serverUser.plan = membershipResponse.data.membership.plan;
                }
                
                // Update session-only state
                window.dashboardState.userProfile = serverUser;
                console.log('✅ Dashboard loaded data from Supabase');
            } else {
                throw new Error(profileResponse.message || 'User not found on server');
            }
        } catch (error) {
            console.error('❌ Error fetching from server:', error);
            // If the server is unreachable or user not found, we cannot proceed with stale data
            showAlert('Session expired or server unreachable. Please login again.', 'error');
            setTimeout(() => {
                localStorage.removeItem('fitnesshub_session');
                window.location.href = 'login.html';
            }, 3000);
            return;
        }

        const user = window.dashboardState.userProfile;
        const isPaid = user && user.membership_status === 'active';
        
        if (user) {
            // Display actual user name (from registration)
            const displayName = user.fullName || userEmail.split('@')[0];
            document.getElementById('userName').textContent = displayName.split(' ')[0]; // First name only
            
            // Display user-specific weight
            if (user.weight) {
                document.getElementById('currentWeight').textContent = user.weight + ' kg';
            }
            
            // ===== DISPLAY PERSONAL INFORMATION =====
            document.getElementById('profileFullName').textContent = user.fullName || '-';
            document.getElementById('profileEmail').textContent = user.email || '-';
            document.getElementById('profilePhone').textContent = user.phone || '-';
            document.getElementById('profileAge').textContent = user.age ? user.age + ' years' : '-';
            document.getElementById('profileGender').textContent = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '-';
            
            // ===== DISPLAY FITNESS PROFILE =====
            document.getElementById('profileHeight').textContent = user.height ? user.height + ' cm' : '-';
            document.getElementById('profileWeight').textContent = user.weight ? user.weight + ' kg' : '-';
            
            // Format fitness goal
            const goalMap = {
                'weight_loss': 'Weight Loss',
                'muscle_gain': 'Muscle Gain',
                'general_fitness': 'General Fitness',
                'general': 'General Fitness',
                'stamina': 'Improve Stamina',
                'flexibility': 'Flexibility',
                'Weight Loss': 'Weight Loss',
                'Muscle Gain': 'Muscle Gain',
                'General Fitness': 'General Fitness',
                'Improve Stamina': 'Improve Stamina',
                'Flexibility': 'Flexibility'
            };
            document.getElementById('profileGoal').textContent = goalMap[user.goal] || user.goal || '-';
            
            // Format experience level
            const experienceMap = {
                'beginner': 'Beginner',
                'intermediate': 'Intermediate',
                'advanced': 'Advanced',
                'Beginner': 'Beginner',
                'Intermediate': 'Intermediate',
                'Advanced': 'Advanced'
            };
            document.getElementById('profileExperience').textContent = experienceMap[user.experience] || user.experience || '-';
            
            // Format join date
            if (user.registrationDate) {
                const joinDate = new Date(user.registrationDate);
                document.getElementById('profileJoinDate').textContent = joinDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            
            // ===== DISPLAY MEMBERSHIP INFORMATION =====
            if (user.plan) {
                const planData = typeof user.plan === 'object' ? user.plan : { type: user.plan, name: user.plan };
                
                document.getElementById('membershipPlanName').textContent = planData.name || 'Selected Plan';
                document.getElementById('membershipType').textContent = planData.type ? planData.type.charAt(0).toUpperCase() + planData.type.slice(1) : '-';
                document.getElementById('membershipPrice').textContent = '₹' + (planData.price || 'N/A') + '/month';
                
                // Set enrollment date
                if (user.registrationDate) {
                    const enrollDate = new Date(user.registrationDate);
                    document.getElementById('membershipEnrollDate').textContent = enrollDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    // Calculate renewal date
                    const renewalDate = new Date(enrollDate);
                    renewalDate.setMonth(renewalDate.getMonth() + 1);
                    document.getElementById('membershipRenewalDate').textContent = renewalDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
                
                // Set plan benefits
                const planBenefits = {
                    'starter': [
                        '<i class="fas fa-check text-success"></i> Unlimited Workouts',
                        '<i class="fas fa-check text-success"></i> Basic Trainer Support',
                        '<i class="fas fa-check text-success"></i> Standard Diet Plans',
                        '<i class="fas fa-check text-success"></i> Monthly Progress Report'
                    ],
                    'professional': [
                        '<i class="fas fa-check text-success"></i> Unlimited Workouts',
                        '<i class="fas fa-check text-success"></i> Personal Trainer Access',
                        '<i class="fas fa-check text-success"></i> Customized Diet Plan',
                        '<i class="fas fa-check text-success"></i> Weekly Progress Tracking',
                        '<i class="fas fa-check text-success"></i> Priority Support'
                    ],
                    'elite': [
                        '<i class="fas fa-check text-success"></i> Unlimited Workouts',
                        '<i class="fas fa-check text-success"></i> Dedicated Personal Trainer',
                        '<i class="fas fa-check text-success"></i> Custom Diet & Nutrition Plans',
                        '<i class="fas fa-check text-success"></i> Daily Progress Tracking',
                        '<i class="fas fa-check text-success"></i> VIP Priority Support',
                        '<i class="fas fa-check text-success"></i> Free Supplements Consultation'
                    ]
                };
                
                const benefits = planBenefits[planData.type] || planBenefits['starter'];
                const benefitsList = document.getElementById('benefitsList');
                if (benefitsList) {
                    benefitsList.innerHTML = benefits.map(benefit => `<li>${benefit}</li>`).join('');
                }

                // Hide upgrade buttons if on Elite plan
                if (planData.type === 'elite') {
                    const upgradeBtns = document.querySelectorAll('button[onclick="upgradeMembership()"]');
                    upgradeBtns.forEach(btn => btn.style.display = 'none');
                }
            }
            
            // Calculate user-specific BMI
            if (user.height && user.weight) {
                const heightInMeters = user.height / 100;
                const bmi = user.weight / (heightInMeters * heightInMeters);
                document.getElementById('bmiValue').textContent = bmi.toFixed(1);
            }
            
            // Store user profile
            window.userProfile = user;
            console.log('✅ User data loaded successfully');
        } else {
            // Use session data to create basic user profile
            window.userProfile = {
                email: userEmail,
                weight: 75,
                height: 175,
                goal: 'weight_loss',
                experience: 'beginner',
                age: 25,
                gender: 'male'
            };
            console.log('⚠️ No full user data found, using basic profile');
        }
        
        // Check payment status
        checkPaymentStatus();
        
        // Check membership status
        checkMembershipStatus();
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        showAlert('Error loading user data', 'danger');
    }
}

// ============================================
// WEIGHT CHART
// ============================================

function initWeightChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx) return;

    let targetWeight = 70;
    let currentWeight = 75;

    if (window.userProfile) {
        currentWeight = window.userProfile.weight;
        targetWeight = currentWeight - 5;
    }

    // Generate dynamic weight data based on user's current weight
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];
    const weightData = [];
    for (let i = 0; i < 8; i++) {
        weightData.push(currentWeight - (i * 0.5));
    }

    const isDarkTheme = currentTheme === 'dark';
    const textColor = isDarkTheme ? '#e0e0e0' : '#1a1a1a';
    const gridColor = isDarkTheme ? 'rgba(0, 255, 65, 0.1)' : 'rgba(0, 168, 107, 0.1)';
    const borderColor = isDarkTheme ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0, 168, 107, 0.3)';
    const tooltipBg = isDarkTheme ? 'rgba(10, 14, 39, 0.9)' : 'rgba(255, 255, 255, 0.95)';
    const tooltipBorder = isDarkTheme ? '#00ff41' : '#00a86b';

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Your Weight',
                    data: weightData,
                    borderColor: '#00a86b',
                    backgroundColor: 'rgba(0, 168, 107, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00a86b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Target Weight',
                    data: Array(labels.length).fill(targetWeight),
                    borderColor: '#ff9600',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    titleColor: tooltipBorder,
                    bodyColor: textColor,
                    titleFont: {
                        family: "'Poppins', sans-serif",
                        size: 13,
                        weight: '700'
                    },
                    bodyFont: {
                        family: "'Poppins', sans-serif",
                        size: 12
                    },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: currentWeight - 10,
                    max: currentWeight + 5,
                    grid: {
                        color: gridColor,
                        drawBorder: true,
                        borderColor: borderColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return value + ' kg';
                        }
                    }
                },
                x: {
                    grid: {
                        color: isDarkTheme ? 'rgba(0, 255, 65, 0.05)' : 'rgba(0, 168, 107, 0.05)',
                        drawBorder: true,
                        borderColor: borderColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// LOAD DASHBOARD DATA
// ============================================

function loadDashboardData() {
    // Load workout data
    loadWorkoutData();
    
    // Load diet data
    loadDietData();
    
    // Load notifications
    loadNotifications();
}

const fitnessMockData = {
    'starter': {
        workout: { name: 'Basic Fitness Routine', level: 'Beginner', duration: '30 mins', exercises: 5 },
        diet: { breakfast: 'Oatmeal', lunch: 'Salad with Paneer', snack: 'Fruit', dinner: 'Veggies & Rice', calories: 1500 }
    },
    'professional': {
        workout: { name: 'Muscle Builder Pro', level: 'Intermediate', duration: '45 mins', exercises: 8 },
        diet: { breakfast: 'Protein Porridge', lunch: 'Chicken/Soya & Brown Rice', snack: 'Nuts', dinner: 'Grilled Fish/Dal & Roti', calories: 2500 }
    },
    'elite': {
        workout: { name: 'Ultimate Athlete Prep', level: 'Advanced', duration: '75 mins', exercises: 12 },
        diet: { breakfast: 'Steak & Eggs / Tofu Scramble', lunch: 'High-Protein Grain Bowl', snack: 'Protein Shake', dinner: 'Lean Protein & Greens', calories: 3500 }
    }
};

function loadWorkoutData() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user')) || {};
    const planType = userData.plan?.type || 'starter';
    const mock = fitnessMockData[planType] || fitnessMockData['starter'];
    
    // Update daily workout card if it exists in dashboard
    const workoutTitle = document.querySelector('.workout-details h6');
    const workoutInfo = document.querySelector('.workout-details p');
    const workoutExercises = document.querySelector('.workout-details small');
    
    if (workoutTitle) workoutTitle.textContent = mock.workout.name;
    if (workoutInfo) workoutInfo.textContent = `${mock.workout.level} Level • ${mock.workout.duration}`;
    if (workoutExercises) workoutExercises.textContent = `${mock.workout.exercises} exercises planned`;

    // Display default workout stats
    const workoutData = {
        today: planType === 'elite' ? 1 : 0,
        thisWeek: planType === 'elite' ? 6 : 4,
        thisMonth: planType === 'elite' ? 24 : 12
    };

    document.getElementById('workoutsDone').textContent = 
        workoutData.thisMonth + '/30';
}

function loadDietData() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user')) || {};
    const planType = userData.plan?.type || 'starter';
    const mock = fitnessMockData[planType] || fitnessMockData['starter'];
    
    // Update diet stats
    if (document.getElementById('caloriesBurned')) {
        document.getElementById('caloriesBurned').textContent = mock.diet.calories + ' kcal';
    }
}

function loadNotifications() {
    // In real app, this would fetch from backend
    console.log('Notifications loaded');
}

// ============================================
// MEMBERSHIP UPGRADE - Dashboard Integration
// ============================================

const membershipPlansOnDashboard = [
    {
        id: 'basic',
        name: 'Basic Plan',
        price: 29,
        period: 'month',
        features: ['Full gym access', 'Standard locker room', 'All machines access', 'One fitness assessment'],
        color: 'primary',
        icon: 'dumbbell'
    },
    {
        id: 'pro',
        name: 'Pro Plan',
        price: 59,
        period: 'month',
        features: ['Full gym access', 'All group classes', 'Free sauna access', 'Personal trainer (1 session)', 'Pool & Spa access'],
        color: 'success',
        icon: 'medal',
        popular: true
    },
    {
        id: 'elite',
        name: 'Elite Plan',
        price: 99,
        period: 'month',
        features: ['All Pro features', 'Unlimited PT sessions', 'Weekly diet consultation', 'Specialized workshops', 'Exclusive VIP lounge'],
        color: 'dark',
        icon: 'crown'
    }
];

let currentSelectedPlanId = null;

function upgradeMembership() {
    // Hide dashboard sections and show selection
    document.getElementById('membershipSelectionSection').classList.remove('section-hidden');
    
    // Auto scroll to it
    document.getElementById('membershipSelectionSection').scrollIntoView({ behavior: 'smooth' });
    
    renderMembershipPlansOnDashboard();
}

function renderMembershipPlansOnDashboard() {
    const grid = document.getElementById('membershipPlansGridOnDashboard');
    if (!grid) return;
    
    grid.innerHTML = membershipPlansOnDashboard.map(plan => `
        <div class="col-md-4 mb-4">
            <div class="plan-card ${plan.popular ? 'popular' : ''} ${currentSelectedPlanId === plan.id ? 'selected' : ''}" 
                 onclick="selectMembershipPlanOnDashboard('${plan.id}')"
                 style="cursor: pointer; transition: transform 0.2s; border: 2px solid ${currentSelectedPlanId === plan.id ? 'var(--fitness-success)' : 'transparent'};">
                <div class="card-body p-4">
                    ${plan.popular ? '<span class="badge bg-success mb-2">Most Popular</span>' : ''}
                    <div class="d-flex align-items-center mb-3">
                        <div class="plan-icon me-3">
                            <i class="fas fa-${plan.icon} fa-2x text-${plan.color}"></i>
                        </div>
                        <h4 class="mb-0">${plan.name}</h4>
                    </div>
                    <div class="plan-price mb-3">
                        <span class="currency">$</span>
                        <span class="amount">${plan.price}</span>
                        <span class="period">/${plan.period}</span>
                    </div>
                    <ul class="list-unstyled mb-4">
                        ${plan.features.map(f => `<li class="mb-2"><i class="fas fa-check text-success me-2"></i> ${f}</li>`).join('')}
                    </ul>
                    <button class="btn ${currentSelectedPlanId === plan.id ? 'btn-success' : 'btn-outline-success'} w-100">
                        ${currentSelectedPlanId === plan.id ? 'Selected' : 'Choose Plan'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function selectMembershipPlanOnDashboard(planId) {
    currentSelectedPlanId = planId;
    const plan = membershipPlansOnDashboard.find(p => p.id === planId);
    
    // Update local user data temporary
    const user = JSON.parse(localStorage.getItem('fitnesshub_user'));
    if (user) {
        user.selectedPlan = planId;
        user.planPrice = plan.price;
        localStorage.setItem('fitnesshub_user', JSON.stringify(user));
    }
    
    // Refresh the grid to show selection
    renderMembershipPlansOnDashboard();
    
    // Show payment section
    document.getElementById('paymentSection').classList.remove('section-hidden');
    document.getElementById('paymentSection').scrollIntoView({ behavior: 'smooth' });
    
    // Pre-fill amount in payment if there's a field
    const amountField = document.getElementById('paymentAmount');
    if (amountField) amountField.value = plan.price;
}

// Payment flow cleanup
function proceedToPaymentFromDashboard() {
    if (!currentSelectedPlanId) {
        alert('Please select a plan first');
        return;
    }
    document.getElementById('paymentSection').classList.remove('section-hidden');
    document.getElementById('paymentSection').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// PAYMENT WINDOW - Logic
// ============================================

function showPaymentWindow() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    const paymentWindowModal = document.getElementById('paymentWindowModal');
    const paymentWindowContent = document.getElementById('paymentWindowContent');
    
    if (!userData) return;
    
    // Create payment form
    paymentWindowContent.innerHTML = `
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i> <strong>Payment Required!</strong>
            <p class="mt-2">Complete your payment to access the dashboard and all features.</p>
        </div>
        
        <div class="row mb-3">
            <div class="col-md-6">
                <h6 class="text-success">Selected Plan</h6>
                <p><strong>${userData.selectedPlan?.name || 'No plan selected'}</strong></p>
            </div>
            <div class="col-md-6 text-end">
                <h6 class="text-success">Amount</h6>
                <p><strong style="font-size: 20px; color: #28a745;">₹${userData.selectedPlan?.price || 0}</strong></p>
            </div>
        </div>
        
        <form id="paymentWindowForm">
            <div class="mb-3">
                <label class="form-label">Payment Method</label>
                <select class="form-control" id="paymentMethod" required onchange="showWindowPaymentMethod()">
                    <option value="">Select Payment Method</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                </select>
            </div>

            <!-- Card Payment Form -->
            <div id="cardPaymentDiv" style="display: none;">
                <div class="mb-2">
                    <label for="winCardName" class="form-label">Cardholder Name</label>
                    <input type="text" class="form-control" id="winCardName" placeholder="Name on card">
                </div>
                <div class="mb-2">
                    <label for="winCardNumber" class="form-label">Card Number</label>
                    <input type="text" class="form-control" id="winCardNumber" placeholder="1234 5678 9012 3456" maxlength="16">
                </div>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <label for="winCardExpiry" class="form-label">Expiry (MM/YY)</label>
                        <input type="text" class="form-control" id="winCardExpiry" placeholder="MM/YY" maxlength="5">
                    </div>
                    <div class="col-md-6 mb-2">
                        <label for="winCardCVC" class="form-label">CVV</label>
                        <input type="text" class="form-control" id="winCardCVC" placeholder="123" maxlength="3">
                    </div>
                </div>
            </div>

            <!-- UPI Payment Form -->
            <div id="upiPaymentDiv" style="display: none;">
                <div class="mb-3">
                    <label for="winUpiId" class="form-label">UPI ID</label>
                    <input type="text" class="form-control" id="winUpiId" placeholder="yourname@bank">
                </div>
            </div>

            <!-- Net Banking Payment Form -->
            <div id="netbankingPaymentDiv" style="display: none;">
                <div class="mb-3">
                    <label for="winBankName" class="form-label">Select Bank</label>
                    <select class="form-control" id="winBankName" required>
                        <option value="">Select a bank</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                        <option value="sbi">State Bank of India</option>
                    </select>
                </div>
            </div>

            <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="agreeWindowTerms" required>
                <label class="form-check-label" for="agreeWindowTerms">
                    I agree to the Terms & Conditions
                </label>
            </div>

            <button type="button" class="btn btn-success w-100" onclick="processWindowPayment()">
                <i class="fas fa-lock"></i> Pay Now ₹${userData.selectedPlan?.price || 0}
            </button>
        </form>
    `;
    
    // Show modal
    if (paymentWindowModal) {
        const modal = new bootstrap.Modal(paymentWindowModal);
        modal.show();
    }
}

function showWindowPaymentMethod() {
    const method = document.getElementById('paymentMethod').value;
    document.getElementById('cardPaymentDiv').style.display = 'none';
    document.getElementById('upiPaymentDiv').style.display = 'none';
    document.getElementById('netbankingPaymentDiv').style.display = 'none';
    
    switch(method) {
        case 'card':
            document.getElementById('cardPaymentDiv').style.display = 'block';
            break;
        case 'upi':
            document.getElementById('upiPaymentDiv').style.display = 'block';
            break;
        case 'netbanking':
            document.getElementById('netbankingPaymentDiv').style.display = 'block';
            break;
    }
}

function processWindowPayment() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    const method = document.getElementById('paymentMethod').value;
    const agreeTerms = document.getElementById('agreeWindowTerms').checked;

    if (!method) {
        alert('Please select a payment method');
        return;
    }

    if (!agreeTerms) {
        alert('Please agree to Terms & Conditions');
        return;
    }

    let isValid = false;

    if (method === 'card') {
        const cardName = document.getElementById('winCardName').value.trim();
        const cardNumber = document.getElementById('winCardNumber').value.trim();
        const cardExpiry = document.getElementById('winCardExpiry').value.trim();
        const cardCVC = document.getElementById('winCardCVC').value.trim();

        if (!cardName || cardNumber.length !== 16 || !cardExpiry.match(/^\d{2}\/\d{2}$/) || cardCVC.length !== 3) {
            alert('Please enter valid card details');
            return;
        }
        isValid = true;
    } else if (method === 'upi') {
        const upiId = document.getElementById('winUpiId').value.trim();
        if (!upiId || !upiId.includes('@')) {
            alert('Please enter valid UPI ID');
            return;
        }
        isValid = true;
    } else if (method === 'netbanking') {
        const bankName = document.getElementById('winBankName').value;
        if (!bankName) {
            alert('Please select a bank');
            return;
        }
        isValid = true;
    }

    if (!isValid) return;

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    setTimeout(() => {
        completePaymentFromWindow(userData);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock"></i> Pay Now ₹' + userData.selectedPlan?.price;
    }, 2000);
}

function completePaymentFromWindow(userData) {
    // Mark payment as complete
    userData.paymentStatus = 'completed';
    userData.isPaid = true;
    userData.paymentDate = new Date().toISOString();
    
    if (userData.selectedPlan && !userData.plan) {
        userData.plan = userData.selectedPlan;
    }

    // Store payment history
    let paymentHistory = JSON.parse(localStorage.getItem('fitnesshub_payment_history') || '[]');
    paymentHistory.push({
        date: userData.paymentDate,
        planName: userData.plan?.name || 'Plan',
        planType: userData.plan?.type || 'unknown',
        amount: userData.plan?.price || 0,
        status: 'completed'
    });
    localStorage.setItem('fitnesshub_payment_history', JSON.stringify(paymentHistory));

    localStorage.setItem('fitnesshub_user', JSON.stringify(userData));

    // Update in Firebase - REMOVED local database sync
    // TODO: Call Firebase API to sync payment status
    console.log('✅ Payment synced (Firebase integration needed)');

    // Close modal and show dashboard
    const modal = bootstrap.Modal.getInstance(document.getElementById('paymentWindowModal'));
    if (modal) modal.hide();
    
    // Hide all flow sections
    const membershipSection = document.getElementById('membershipSelectionSection');
    const paymentModal = document.getElementById('paymentWindowModal');
    const dashboardContent = document.getElementById('dashboardContentSection');
    
    if (membershipSection) membershipSection.style.display = 'none';
    if (paymentModal) paymentModal.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';
    
    console.log('✅ Flow sections hidden, dashboard shown');
    
    showAlert('✅ Payment Successful! Welcome to your dashboard.', 'success');
    
    setTimeout(() => {
        checkProfileCompletion();
        loadPaymentHistory();
    }, 1000);
}

function loadPaymentHistory() {
    const historyBody = document.getElementById('paymentHistoryBody');
    const noPaymentMsg = document.getElementById('noPaymentMessage');
    const historyTable = document.getElementById('paymentHistoryTable');
    
    const paymentHistory = JSON.parse(localStorage.getItem('fitnesshub_payment_history') || '[]');
    
    if (paymentHistory.length === 0) {
        noPaymentMsg.style.display = 'block';
        historyTable.style.display = 'none';
        return;
    }
    
    noPaymentMsg.style.display = 'none';
    historyTable.style.display = 'table';
    historyBody.innerHTML = '';
    
    paymentHistory.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(payment.date)}</td>
            <td><strong>${payment.planName}</strong></td>
            <td>₹${payment.amount}</td>
            <td><span class="badge bg-success">Completed</span></td>
        `;
        historyBody.appendChild(row);
    });
}

// ============================================

// Setup payment method visibility
document.addEventListener('DOMContentLoaded', () => {
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', showPaymentMethod);
    }
});

function showPaymentMethod() {
    const method = document.getElementById('paymentMethod').value;
    document.getElementById('cardPaymentDiv').style.display = 'none';
    document.getElementById('upiPaymentDiv').style.display = 'none';
    document.getElementById('netbankingPaymentDiv').style.display = 'none';
    
    switch(method) {
        case 'card':
            document.getElementById('cardPaymentDiv').style.display = 'block';
            break;
        case 'upi':
            document.getElementById('upiPaymentDiv').style.display = 'block';
            break;
        case 'netbanking':
            document.getElementById('netbankingPaymentDiv').style.display = 'block';
            break;
    }
}

function processPaymentFromDashboard() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    const method = document.getElementById('paymentMethod').value;
    const agreeTerms = document.getElementById('agreePaymentTerms').checked;

    if (!method) {
        alert('Please select a payment method');
        return;
    }

    if (!agreeTerms) {
        alert('Please agree to Terms & Conditions');
        return;
    }

    let isValid = false;

    if (method === 'card') {
        const cardName = document.getElementById('dashCardName').value.trim();
        const cardNumber = document.getElementById('dashCardNumber').value.trim();
        const cardExpiry = document.getElementById('dashCardExpiry').value.trim();
        const cardCVC = document.getElementById('dashCardCVC').value.trim();

        if (!cardName) {
            alert('Please enter cardholder name');
            return;
        }
        if (cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
            alert('Please enter a valid card number (16 digits)');
            return;
        }
        if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
            alert('Please enter expiry in MM/YY format');
            return;
        }
        if (cardCVC.length !== 3 || !/^\d+$/.test(cardCVC)) {
            alert('Please enter a valid CVV (3 digits)');
            return;
        }
        isValid = true;
    } else if (method === 'upi') {
        const upiId = document.getElementById('upiId').value.trim();
        if (!upiId || !upiId.includes('@')) {
            alert('Please enter a valid UPI ID');
            return;
        }
        isValid = true;
    } else if (method === 'netbanking') {
        const bankName = document.getElementById('bankName').value;
        if (!bankName) {
            alert('Please select a bank');
            return;
        }
        isValid = true;
    }

    if (!isValid) return;

    // Show processing state
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment...';

    // Simulate payment processing
    setTimeout(() => {
        completePayment(userData);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock"></i> Make Payment';
    }, 2000);
}

function completePayment(userData) {
    // Mark payment as complete
    userData.paymentStatus = 'completed';
    userData.isPaid = true;
    userData.paymentDate = new Date().toISOString();
    
    // Use selectedPlan or plan field
    if (userData.selectedPlan && !userData.plan) {
        userData.plan = userData.selectedPlan;
    }

    localStorage.setItem('fitnesshub_user', JSON.stringify(userData));

    // SYNC: Update registered users list for admin panel - REMOVED
    // Using Firebase only now
    console.log('✅ Payment status synced (Local Admin List sync removed)');

    // Hide payment section
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection) {
        paymentSection.style.display = 'none';
    }

    // Show success alert
    showAlert('✅ Payment Successful! Your membership is now active.', 'success');
    
    // Reload page after 2 seconds
    setTimeout(() => {
        location.reload();
    }, 2000);
}

function checkPaymentStatus() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    const paymentSection = document.getElementById('paymentSection');
    
    console.log('💳 Checking Payment Status:', userData?.paymentStatus, 'isPaid:', userData?.isPaid);
    
    // Show payment section ONLY if payment is NOT complete
    if (!userData || userData.isPaid !== true) {
        // Payment NOT done - show payment form
        if (paymentSection) {
            paymentSection.style.display = 'block';
            console.log('✅ Showing payment section - user needs to pay');
            
            // Populate payment info
            const selectedPlan = userData?.selectedPlan || userData?.plan;
            if (selectedPlan) {
                document.getElementById('paymentPlanName').textContent = selectedPlan.name;
                document.getElementById('paymentPrice').textContent = '₹' + selectedPlan.price + '/month';
                document.getElementById('paymentTotal').textContent = '₹' + selectedPlan.price;
            }
        }
        return;
    }
    
    // Payment IS done - hide payment form
    if (paymentSection) {
        paymentSection.style.display = 'none';
        console.log('❌ Hiding payment section - already paid');
    }
}

// ============================================
// CHECK PROFILE COMPLETION STATUS
// ============================================

function checkProfileCompletion() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    const fillProfileSection = document.getElementById('fillProfileSection');
    const dashboardContentSection = document.getElementById('dashboardContentSection');
    
    // Check if profile info is complete (has name, email, phone, age, gender)
    const isProfileComplete = userData && userData.fullName && userData.email && userData.phone && userData.age && userData.gender;
    
    if (!isProfileComplete) {
        // Show fill profile section
        if (fillProfileSection) fillProfileSection.style.display = 'block';
        if (dashboardContentSection) dashboardContentSection.style.display = 'none';
        
        // Populate current values
        if (userData?.email) {
            document.getElementById('fillProfileEmail').value = userData.email;
        }
        if (userData?.fullName) {
            document.getElementById('fillProfileName').value = userData.fullName;
        }
        if (userData?.phone) {
            document.getElementById('fillProfilePhone').value = userData.phone;
        }
        if (userData?.age) {
            document.getElementById('fillProfileAge').value = userData.age;
        }
        if (userData?.gender) {
            document.getElementById('fillProfileGender').value = userData.gender;
        }
        
        console.log('⚠️ Profile incomplete - showing fill profile section');
    } else {
        // Hide fill profile section, show dashboard
        if (fillProfileSection) fillProfileSection.style.display = 'none';
        if (dashboardContentSection) dashboardContentSection.style.display = 'block';
        console.log('✅ Profile complete - showing dashboard');
    }
}

function saveFillProfile() {
    const name = document.getElementById('fillProfileName').value.trim();
    const email = document.getElementById('fillProfileEmail').value.trim();
    const phone = document.getElementById('fillProfilePhone').value.trim();
    const age = document.getElementById('fillProfileAge').value.trim();
    const gender = document.getElementById('fillProfileGender').value.trim();
    
    if (!name) {
        alert('❌ Please enter your full name');
        return;
    }
    if (!email) {
        alert('❌ Email is required');
        return;
    }
    if (!phone) {
        alert('❌ Please enter your phone number');
        return;
    }
    if (!age) {
        alert('❌ Please enter your age');
        return;
    }
    if (!gender) {
        alert('❌ Please select your gender');
        return;
    }
    
    // Validate phone (basic check)
    if (phone.length < 10 || !/^\d+$/.test(phone.replace(/[\s\-]/g, ''))) {
        alert('❌ Please enter a valid phone number');
        return;
    }
    
    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        alert('❌ Please enter a valid age (between 13 and 120)');
        return;
    }
    
    // Update user data
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    userData.fullName = name;
    userData.phone = phone;
    userData.age = ageNum;
    userData.gender = gender;
    userData.profileCompleted = true;
    userData.profileCompletedAt = new Date().toISOString();
    
    localStorage.setItem('fitnesshub_user', JSON.stringify(userData));
    console.log('✅ Profile saved:', name, phone, ageNum, gender);
    
    // Also update in registered users list
    const registeredUsers = localStorage.getItem('fitnesshub_registered_users');
    if (registeredUsers) {
        try {
            const users = JSON.parse(registeredUsers);
            const userIndex = users.findIndex(u => u.email === email);
            if (userIndex >= 0) {
                users[userIndex].fullName = name;
                users[userIndex].phone = phone;
                users[userIndex].age = ageNum;
                users[userIndex].gender = gender;
                users[userIndex].profileCompleted = true;
                localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users));
            }
        } catch (err) {
            console.log('⚠️ Error updating registered users:', err);
        }
    }
    
    // Show success and update display
    showAlert('✅ Profile saved successfully!', 'success');
    checkProfileCompletion();
}

// ============================================
// LOGOUT FUNCTIONALITY
// ============================================

function logout() {
    console.log('🔄 User logout initiated...');
    if (confirm('Are you sure you want to logout?')) {
        // Clear all session related items
        localStorage.removeItem('fitnesshub_session');
        localStorage.removeItem('fitnesshub_user');
        console.log('✅ Session cleared, redirecting...');
        window.location.href = '../index.html';
    }
}
window.logout = logout;

// ============================================
// EDIT PROFILE FUNCTIONALITY
// ============================================

function openEditProfileModal() {
    try {
        const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
        
        if (!userData) {
            showAlert('Error: User data not found', 'danger');
            return;
        }
        
        // Populate form with current data
        document.getElementById('editFullName').value = userData.fullName || '';
        document.getElementById('editEmail').value = userData.email || '';
        document.getElementById('editPhone').value = userData.phone || '';
        document.getElementById('editAge').value = userData.age || '';
        document.getElementById('editGender').value = userData.gender || '';
        document.getElementById('editHeight').value = userData.height || '';
        document.getElementById('editWeight').value = userData.weight || '';
        document.getElementById('editGoal').value = userData.goal || '';
        document.getElementById('editExperience').value = userData.experience || '';
        
        // Open modal
        const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        modal.show();
        console.log('✅ Edit profile modal opened');
    } catch (error) {
        console.error('❌ Error opening edit profile modal:', error);
        showAlert('Error opening profile editor', 'danger');
    }
}

function saveProfileChanges() {
    try {
        const fullName = document.getElementById('editFullName').value.trim();
        
        // Validate mandatory field
        if (!fullName) {
            showAlert('❌ Full Name is mandatory!', 'danger');
            return;
        }
        
        const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
        const sessionData = JSON.parse(localStorage.getItem('fitnesshub_session'));
        
        // Update user data
        userData.fullName = fullName;
        userData.phone = document.getElementById('editPhone').value || userData.phone;
        userData.age = parseInt(document.getElementById('editAge').value) || userData.age;
        userData.gender = document.getElementById('editGender').value || userData.gender;
        userData.height = parseFloat(document.getElementById('editHeight').value) || userData.height;
        userData.weight = parseFloat(document.getElementById('editWeight').value) || userData.weight;
        userData.goal = document.getElementById('editGoal').value || userData.goal;
        userData.experience = document.getElementById('editExperience').value || userData.experience;
        userData.profileCompletedAt = new Date().toISOString();
        userData.profileCompleted = true;
        
        // Save to localStorage
        localStorage.setItem('fitnesshub_user', JSON.stringify(userData));
        window.dashboardState.userProfile = userData;
        
        // SYNC: Also update in registered users list for admin panel display
        const registeredUsers = localStorage.getItem('fitnesshub_registered_users');
        if (registeredUsers && sessionData) {
            try {
                const users = JSON.parse(registeredUsers);
                const userIndex = users.findIndex(u => u.email === sessionData.email);
                if (userIndex >= 0) {
                    users[userIndex] = {
                        ...users[userIndex],
                        fullName: userData.fullName,
                        phone: userData.phone,
                        age: userData.age,
                        gender: userData.gender,
                        height: userData.height,
                        weight: userData.weight,
                        goal: userData.goal,
                        experience: userData.experience,
                        profileCompletedAt: userData.profileCompletedAt
                    };
                    localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users));
                    console.log('✅ Synced profile info to registered users list');
                }
            } catch (err) {
                console.log('⚠️ Error syncing to registered users:', err);
            }
        }
        
        // Also save to Supabase if configured
        if (sessionData && typeof updateUser === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
            const updateData = {
                full_name: userData.fullName,
                phone: userData.phone,
                age: userData.age,
                gender: userData.gender,
                height: userData.height,
                weight: userData.weight,
                fitness_goal: userData.goal,
                experience: userData.experience
            };
            
            updateUser(sessionData.email, updateData)
                .then(result => {
                    console.log('✅ Profile updated in Supabase:', result);
                })
                .catch(err => {
                    console.log('ℹ️ Supabase update error (using localStorage):', err.message);
                });
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        if (modal) modal.hide();
        
        // Show success and reload
        showAlert('✅ Profile updated successfully!', 'success');
        console.log('✅ Profile changes saved');
        
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (error) {
        console.error('❌ Error saving profile changes:', error);
        showAlert('❌ Error saving profile changes', 'danger');
    }
}

// ============================================
// CHECK MANDATORY PROFILE FOR NEW USERS
// ============================================

function checkMandatoryProfileCompletion() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    
    if (!userData) return;
    
    // Only show if fitness info is already completed
    const fitnessCompleted = localStorage.getItem('fitnesshub_fitness_completed');
    if (!fitnessCompleted) {
        return; // Skip if fitness not completed yet
    }
    
    // If profile is newly created (no completion flag) and full name is not set properly
    const isNewUser = !userData.profileCompleted;
    const noFullName = !userData.fullName || userData.fullName === '';
    
    if (isNewUser || noFullName) {
        showAlert('⚠️ Please complete your profile to continue', 'warning');
        setTimeout(() => {
            openEditProfileModal();
        }, 500);
    }
}

// ============================================
// ============================================
// Check fitness info completion (FIRST LOGIN ONLY)
function showFitnessInfoModal() {
    try {
        // Make sure no other modal is open
        const editModalEl = document.getElementById('editProfileModal');
        if (editModalEl) {
            const editModal = bootstrap.Modal.getInstance(editModalEl);
            if (editModal) {
                editModal.hide();
            }
        }
        
        // Clear form
        document.getElementById('fitnessAge').value = '';
        document.getElementById('fitnessGender').value = '';
        document.getElementById('fitnessHeight').value = '';
        document.getElementById('fitnessWeight').value = '';
        document.getElementById('fitnessGoal').value = '';
        document.getElementById('fitnessExperience').value = '';
        
        // Show fitness modal with static backdrop (cannot be dismissed)
        const modal = new bootstrap.Modal(document.getElementById('fitnessinfoModal'), {
            backdrop: 'static',
            keyboard: false
        });
        modal.show();
        console.log('✅ Fitness info modal displayed');
    } catch (error) {
        console.error('❌ Error showing fitness modal:', error);
        showAlert('Error opening fitness form', 'danger');
    }
}

// Save fitness information
function saveFitnessInfo() {
    try {
        const age = document.getElementById('fitnessAge').value.trim();
        const gender = document.getElementById('fitnessGender').value.trim();
        const height = parseFloat(document.getElementById('fitnessHeight').value);
        const weight = parseFloat(document.getElementById('fitnessWeight').value);
        const goal = document.getElementById('fitnessGoal').value.trim();
        const experience = document.getElementById('fitnessExperience').value.trim();
        
        // Validate all fields
        if (!age || !gender || !height || !weight || !goal || !experience) {
            showAlert('❌ Please fill in all fitness information fields!', 'danger');
            return;
        }
        
        // Get current user data
        const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
        const sessionData = JSON.parse(localStorage.getItem('fitnesshub_session'));
        
        // Update fitness info
        userData.age = parseInt(age);
        userData.gender = gender;
        userData.height = height;
        userData.weight = weight;
        userData.goal = goal;
        userData.experience = experience;
        userData.fitnessCompleted = true;
        userData.fitnessCompletedAt = new Date().toISOString();
        userData.profileCompleted = true;
        
        // Save to localStorage
        localStorage.setItem('fitnesshub_user', JSON.stringify(userData));
        localStorage.setItem('fitnesshub_fitness_completed', 'true');
        
        // Update dashboard state
        window.dashboardState.userProfile = userData;
        window.dashboardState.fitnessCompleted = true;
        console.log('✅ Fitness info saved for:', sessionData.email);
        
        // SYNC: Also update in registered users list for admin panel display
        const registeredUsers = localStorage.getItem('fitnesshub_registered_users');
        if (registeredUsers && sessionData) {
            try {
                const users = JSON.parse(registeredUsers);
                const userIndex = users.findIndex(u => u.email === sessionData.email);
                if (userIndex >= 0) {
                    users[userIndex] = {
                        ...users[userIndex],
                        age: userData.age,
                        gender: userData.gender,
                        height: userData.height,
                        weight: userData.weight,
                        goal: userData.goal,
                        experience: userData.experience,
                        fitnessCompletedAt: userData.fitnessCompletedAt
                    };
                    localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users));
                    console.log('✅ Synced fitness info to registered users list');
                }
            } catch (err) {
                console.log('⚠️ Error syncing to registered users:', err);
            }
        }
        
        // Also save to Supabase if configured
        if (sessionData && typeof updateUser === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
            const updateData = {
                age: userData.age,
                gender: userData.gender,
                height: userData.height,
                weight: userData.weight,
                fitness_goal: userData.goal,
                experience: userData.experience
            };
            
            updateUser(sessionData.email, updateData)
                .then(result => {
                    console.log('✅ Fitness info saved to Supabase:', result);
                })
                .catch(err => {
                    console.log('ℹ️ Supabase save error (using localStorage):', err.message);
                });
        }
        
        // Hide modal
        try {
            const modal = bootstrap.Modal.getInstance(document.getElementById('fitnessinfoModal'));
            if (modal) {
                modal.hide();
            }
        } catch (e) {
            console.log('Modal close handled');
        }
        
        // Show success
        showAlert('✅ Fitness profile saved successfully!', 'success');
        console.log('✅ Fitness information saved');
        
        // Reload page after brief delay to show all updates
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (error) {
        console.error('❌ Error saving fitness info:', error);
        showAlert('❌ Error saving fitness information', 'danger');
    }
}

// ============================================
// LOAD ADMIN ASSIGNMENTS
// ============================================

async function loadAdminAssignments() {
    try {
        const sessionData = localStorage.getItem('fitnesshub_session');
        if (!sessionData) return;

        const session = JSON.parse(sessionData);
        const userEmail = session.email;

        // Try to get from Supabase first
        if (typeof getAdminAssignments === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
            try {
                const assignments = await getAdminAssignments(userEmail);
                if (assignments) {
                    window.dashboardState.userAssignments = assignments;
                    localStorage.setItem(`user_${userEmail}_assignments`, JSON.stringify(assignments || {}));
                    console.log('✅ Admin assignments loaded from Supabase:', assignments);
                    return;
                }
            } catch (err) {
                console.log('ℹ️ Supabase assignments load error:', err.message);
            }
        }
        
        // Fall back to localStorage
        const stored = localStorage.getItem(`user_${userEmail}_assignments`);
        if (stored) {
            window.dashboardState.userAssignments = JSON.parse(stored);
            console.log('✅ Admin assignments loaded from localStorage');
        } else {
            window.dashboardState.userAssignments = {};
            console.log('ℹ️ No admin assignments yet');
        }
    } catch (error) {
        console.error('❌ Error loading admin assignments:', error);
        window.dashboardState.userAssignments = {};
    }
}

// ============================================
// GENERATE ADMIN-ASSIGNED CONTENT
// ============================================

function getAdminAssignedTrainerContent() {
    const assignments = window.userAssignments || {};
    const assignedTrainer = assignments.trainer;

    if (!assignedTrainer) {
        return getDefaultTrainerContent();
    }

    const trainerEmojis = {
        'Coach Rajesh': '💪',
        'Coach Amit': '🏋️',
        'Coach Priya': '🧘',
        'Coach Vikram': '⚡'
    };

    const trainerDescriptions = {
        'Coach Rajesh': 'Strength & Fitness Expert',
        'Coach Amit': 'HIIT & Cardio Specialist',
        'Coach Priya': 'Yoga & Flexibility Coach',
        'Coach Vikram': 'CrossFit & Power Training'
    };

    const emoji = trainerEmojis[assignedTrainer] || '👨‍🏫';
    const description = trainerDescriptions[assignedTrainer] || 'Your Personal Trainer';
    const performanceRating = assignments.performance ? `(Rating: ${assignments.performance}/10)` : '';

    return `
        <div class="dashboard-card">
            <div class="card-header">
                <h5><i class="fas fa-user-tie"></i> Your Assigned Trainers</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-success">
                    <strong>✨ Admin-Assigned Trainer</strong> ${performanceRating}
                </div>
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <div class="trainer-card text-center p-4 border rounded" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <div class="avatar mb-2" style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px;">
                                ${emoji}
                            </div>
                            <h5 style="color: white; margin-bottom: 0.5rem;">${assignedTrainer}</h5>
                            <p style="color: rgba(255,255,255,0.9); margin-bottom: 1rem;"><small>${description}</small></p>
                            ${assignments.notes ? `<p style="font-style: italic; font-size: 0.9rem; color: rgba(255,255,255,0.8);"><strong>Notes:</strong> ${assignments.notes}</p>` : ''}
                            <button class="btn btn-light btn-sm" style="margin-top: 0.5rem;"><i class="fas fa-video"></i> Schedule Call</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getAdminAssignedWorkoutContent() {
    const assignments = window.userAssignments || {};
    const assignedWorkout = assignments.workoutPlan;

    if (!assignedWorkout) {
        return getDefaultWorkoutContent();
    }

    const workoutDetails = {
        'Cardio Blast': { icon: 'fa-running', duration: '30 minutes', frequency: '4x per week', desc: 'High-intensity cardio training' },
        'Strength Training': { icon: 'fa-dumbbell', duration: '45 minutes', frequency: '3x per week', desc: 'Progressive strength & muscle building' },
        'HIIT': { icon: 'fa-fire', duration: '20 minutes', frequency: '3x per week', desc: 'High Intensity Interval Training' },
        'Yoga': { icon: 'fa-spa', duration: '50 minutes', frequency: '2x per week', desc: 'Flexibility & mindfulness training' }
    };

    const workout = workoutDetails[assignedWorkout] || { icon: 'fa-dumbbell', duration: 'Varies', frequency: 'TBD', desc: 'Workout plan' };

    return `
        <div class="dashboard-card">
            <div class="card-header">
                <h5><i class="fas fa-dumbbell"></i> Your Workout Plans</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <strong>✨ Admin-Assigned Workout Plan</strong>
                </div>
                <div class="row mt-3">
                    <div class="col-md-12 mb-3">
                        <div class="dashboard-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                            <h5 class="mb-2" style="color: white;"><i class="fas ${workout.icon}"></i> ${assignedWorkout}</h5>
                            <p style="color: rgba(255,255,255,0.9); margin-bottom: 0.5rem;"><small>${workout.desc}</small></p>
                            <div class="row mt-3" style="color: rgba(255,255,255,0.9);">
                                <div class="col-6">
                                    <small><strong>Duration:</strong> ${workout.duration}</small>
                                </div>
                                <div class="col-6">
                                    <small><strong>Frequency:</strong> ${workout.frequency}</small>
                                </div>
                            </div>
                            <button class="btn btn-light btn-sm mt-3"><i class="fas fa-play"></i> Start Workout</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getAdminAssignedDietContent() {
    const assignments = window.userAssignments || {};
    const assignedDiet = assignments.dietPlan;

    if (!assignedDiet) {
        return getDefaultDietContent();
    }

    const dietPlanDetails = {
        'Weight Loss': { color: '#ff6b6b', icon: '🔥', goal: 'Calorie deficit', target: '1800 kcal' },
        'Muscle Gain': { color: '#4ecdc4', icon: '💪', goal: 'Protein surplus', target: '2800 kcal' },
        'Balanced': { color: '#95e1d3', icon: '⚖️', goal: 'Maintenance', target: '2200 kcal' },
        'Keto': { color: '#ffd93d', icon: '🥑', goal: 'Low carb', target: '2000 kcal' }
    };

    const diet = dietPlanDetails[assignedDiet] || { color: '#667eea', icon: '🍽️', goal: 'Diet Plan', target: '2200 kcal' };

    return `
        <div class="dashboard-card">
            <div class="card-header">
                <h5><i class="fas fa-apple-alt"></i> Your Diet Plan</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <strong>✨ Admin-Assigned Diet Plan</strong>
                </div>
                <div style="background: linear-gradient(135deg, ${diet.color} 0%, rgba(102, 126, 234, 0.8) 100%); color: white; padding: 2rem; border-radius: 10px; text-align: center; margin-top: 1rem;">
                    <h3 style="color: white; margin-bottom: 0.5rem;">${diet.icon} ${assignedDiet}</h3>
                    <p style="font-size: 1.3rem; font-weight: bold; margin-bottom: 1rem; color: white;">${diet.target}</p>
                    <p style="color: rgba(255,255,255,0.9);">Goal: <strong>${diet.goal}</strong></p>
                    <button class="btn btn-light btn-sm mt-3"><i class="fas fa-utensils"></i> View Meal Plan</button>
                </div>
            </div>
        </div>
    `;
}

function getDefaultTrainerContent() {
    return `
       <div class="dashboard-card">
            <div class="card-header">
                <h5><i class="fas fa-user-tie"></i> Your Assigned Trainers</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <div class="trainer-card text-center p-3 border rounded">
                            <div class="avatar mb-2" style="width: 60px; height: 60px; background: #00a86b; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
                                💪
                            </div>
                            <h6>Coach Rajesh</h6>
                            <p class="text-muted"><small>Strength & Fitness Expert</small></p>
                            <button class="btn btn-sm btn-success"><i class="fas fa-video"></i> Video Call</button>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="trainer-card text-center p-3 border rounded">
                            <div class="avatar mb-2" style="width: 60px; height: 60px; background: #ff6b6b; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
                                🥗
                            </div>
                            <h6>Priya (Nutritionist)</h6>
                            <p class="text-muted"><small>Diet & Nutrition Specialist</small></p>
                            <button class="btn btn-sm btn-success"><i class="fas fa-video"></i> Video Call</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getDefaultWorkoutContent() {
    return `
        <div class="dashboard-card">
            <div class="card-header">
                <h5><i class="fas fa-dumbbell"></i> Your Workout Plans</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <strong>Based on your profile:</strong> You're a Beginner targeting General Fitness
                </div>
                <div class="row mt-3">
                    <div class="col-md-6 mb-3">
                        <div class="dashboard-card">
                            <h6 class="text-success mb-2"><i class="fas fa-running"></i> Cardio Blast</h6>
                            <p><small>Duration: 30 minutes • 4x per week</small></p>
                            <button class="btn btn-sm btn-success"><i class="fas fa-play"></i> Start</button>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="dashboard-card">
                            <h6 class="text-success mb-2"><i class="fas fa-dumbbell"></i> Strength Training</h6>
                            <p><small>Duration: 45 minutes • 3x per week</small></p>
                            <button class="btn btn-sm btn-success"><i class="fas fa-play"></i> Start</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getDefaultDietContent() {
    return `
        <div class="dashboard-card">
            <div class="card-header">
                <h5><i class="fas fa-apple-alt"></i> Your Diet Plan</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-success">
                    <strong>Daily Calorie Goal:</strong> 2200 kcal | Protein: 150g
                </div>
                <div class="row mt-3">
                    <div class="col-md-3">
                        <div class="text-center">
                            <h6>Breakfast</h6>
                            <p class="text-success"><strong>450 kcal</strong></p>
                            <small>Oats + Milk + Eggs</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <h6>Lunch</h6>
                            <p class="text-success"><strong>650 kcal</strong></p>
                            <small>Rice + Chicken + Veggies</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <h6>Snack</h6>
                            <p class="text-success"><strong>200 kcal</strong></p>
                            <small>Fruits + Almonds</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <h6>Dinner</h6>
                            <p class="text-success"><strong>600 kcal</strong></p>
                            <small>Fish + Salad</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// ALERT NOTIFICATION
// ============================================

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert" id="${alertId}">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    alertContainer.insertAdjacentHTML('beforeend', alertHTML);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// ============================================
// AI RECOMMENDATIONS ENGINE
// ============================================

class AIFitnessRecommender {
    constructor(userProfile) {
        this.profile = userProfile;
    }

    getWorkoutRecommendation() {
        const { goal, experience, weight, height, age } = this.profile;
        
        const workoutPlans = {
            weight_loss: {
                beginner: {
                    name: 'Beginner Weight Loss',
                    duration: '30-45 min',
                    frequency: '4x per week',
                    exercises: [
                        { name: 'Brisk Walking/Jogging', duration: '20-30 min', intensity: 'Moderate' },
                        { name: 'Swimming', duration: '30 min', intensity: 'High' },
                        { name: 'Cycling', duration: '30 min', intensity: 'Moderate' },
                        { name: 'Jump Rope', duration: '15 min', intensity: 'High' }
                    ]
                },
                intermediate: {
                    name: 'Intermediate Weight Loss',
                    duration: '45-60 min',
                    frequency: '5x per week',
                    exercises: [
                        { name: 'HIIT Training', duration: '30 min', intensity: 'Very High' },
                        { name: 'Circuit Training', duration: '45 min', intensity: 'High' },
                        { name: 'CrossFit', duration: '50 min', intensity: 'Very High' },
                        { name: 'Box Jumping', duration: '20 min', intensity: 'Very High' }
                    ]
                },
                advanced: {
                    name: 'Advanced Weight Loss',
                    duration: '60-90 min',
                    frequency: '6x per week',
                    exercises: [
                        { name: 'Advanced HIIT', duration: '40 min', intensity: 'Extreme' },
                        { name: 'Strength + Cardio Combo', duration: '60 min', intensity: 'Very High' },
                        { name: 'Functional Training', duration: '50 min', intensity: 'Very High' }
                    ]
                }
            },
            muscle_gain: {
                beginner: {
                    name: 'Beginner Muscle Building',
                    duration: '45-60 min',
                    frequency: '4x per week',
                    exercises: [
                        { name: 'Bench Press', sets: 3, reps: '8-10' },
                        { name: 'Squats', sets: 3, reps: '8-10' },
                        { name: 'Deadlifts', sets: 3, reps: '6-8' },
                        { name: 'Pull-ups', sets: 3, reps: '8-10' }
                    ]
                },
                intermediate: {
                    name: 'Intermediate Muscle Building',
                    duration: '60-90 min',
                    frequency: '5x per week',
                    exercises: [
                        { name: 'Hypertrophy Training', sets: 4, reps: '8-12' },
                        { name: 'Compound Movements', sets: 4, reps: '6-8' },
                        { name: 'Isolation Exercises', sets: 3, reps: '10-15' }
                    ]
                }
            }
        };

        return workoutPlans[goal]?.[experience] || workoutPlans.muscle_gain.beginner;
    }

    getDietRecommendation() {
        const { goal, weight, height, age } = this.profile;
        const bmi = weight / ((height / 100) ** 2);
        
        let calories = 2000;
        let protein = 1.6;
        let carbs = 4.5;
        let fats = 1.2;

        if (goal === 'weight_loss') {
            calories = weight * 25; // 25 cal per kg for weight loss
            protein = weight * 2.2; // Higher protein during weight loss
            carbs = weight * 2;
            fats = weight * 0.8;
        } else if (goal === 'muscle_gain') {
            calories = weight * 30; // 30 cal per kg for muscle gain
            protein = weight * 2.2;
            carbs = weight * 4;
            fats = weight * 1;
        }

        return {
            dailyCalories: Math.round(calories),
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fats: Math.round(fats),
            meals: this.getOptimalMeals(goal)
        };
    }

    getOptimalMeals(goal) {
        const mealPlans = {
            weight_loss: [
                { name: 'Breakfast', examples: ['Oatmeal with berries', 'Eggs with whole wheat toast', 'Smoothie'] },
                { name: 'Lunch', examples: ['Grilled chicken with salad', 'Fish with brown rice', 'Veggie bowl'] },
                { name: 'Snack', examples: ['Greek yogurt', 'Nuts', 'Fruits'] },
                { name: 'Dinner', examples: ['Lean meat with vegetables', 'Tofu stir fry', 'Fish with sweet potato'] }
            ],
            muscle_gain: [
                { name: 'Breakfast', examples: ['Eggs with toast and avocado', 'Pancakes with peanut butter', 'Protein smoothie'] },
                { name: 'Lunch', examples: ['Steak with rice', 'Chicken with pasta', 'Salmon with potatoes'] },
                { name: 'Snack', examples: ['Protein shake', 'Almonds', 'Banana with peanut butter'] },
                { name: 'Dinner', examples: ['Ground beef tacos', 'Chicken breast with broccoli', 'Tuna with rice'] }
            ]
        };

        return mealPlans[goal] || mealPlans.muscle_gain;
    }

    generateInsights() {
        const { weight, height, goal, age } = this.profile;
        const bmi = weight / ((height / 100) ** 2);
        
        const insights = [];

        if (bmi < 18.5) {
            insights.push({
                type: 'warning',
                message: 'You are underweight. Focus on muscle-building workouts and adequate nutrition.'
            });
        } else if (bmi > 25) {
            insights.push({
                type: 'info',
                message: 'You are overweight. Consider increasing cardio sessions and reducing calorie intake.'
            });
        }

        if (goal === 'muscle_gain') {
            insights.push({
                type: 'success',
                message: 'Great! Increase your protein intake to 2.2g per kg of body weight.'
            });
        }

        if (age > 40) {
            insights.push({
                type: 'info',
                message: 'As you age, focus more on resistance training and flexibility work.'
            });
        }

        return insights;
    }
}

// ============================================
// REAL-TIME NOTIFICATIONS
// ============================================

class NotificationManager {
    constructor() {
        this.notifications = [];
    }

    addNotification(title, message, type = 'info') {
        const notification = {
            id: Date.now(),
            title: title,
            message: message,
            type: type,
            timestamp: new Date()
        };

        this.notifications.push(notification);
        this.displayNotification(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, 5000);
    }

    displayNotification(notification) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert alert-${notification.type}`;
        notificationDiv.innerHTML = `
            <strong>${notification.title}</strong>
            <p>${notification.message}</p>
        `;

        const container = document.querySelector('.dashboard-container');
        if (container) {
            container.insertBefore(notificationDiv, container.firstChild);
        }
    }

    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
    }
}

// ============================================
// MEMBERSHIP STATUS & PURCHASE
// ============================================

const membershipPlans = [
    {
        name: 'Starter Pack',
        type: 'starter',
        price: 999,
        duration: '1 month',
        emoji: '⭐',
        features: [
            'Unlimited Workouts',
            'Basic Trainer Support',
            'Standard Diet Plans',
            'Monthly Progress Report'
        ]
    },
    {
        name: 'Professional',
        type: 'professional',
        price: 1999,
        duration: '1 month',
        emoji: '🏆',
        features: [
            'Unlimited Workouts',
            'Personal Trainer Access',
            'Customized Diet Plan',
            'Weekly Progress Tracking',
            'Priority Support'
        ]
    },
    {
        name: 'Elite Plus',
        type: 'elite',
        price: 2999,
        duration: '1 month',
        emoji: '👑',
        features: [
            'Unlimited Workouts',
            'Dedicated Personal Trainer',
            'Custom Diet & Nutrition Plans',
            'Daily Progress Tracking',
            'VIP Priority Support',
            'Free Supplements Consultation'
        ]
    }
];

function checkMembershipStatus() {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    const pending = document.getElementById('membershipStatusPending');
    const active = document.getElementById('membershipStatusActive');
    
    if (!userData) {
        if (pending) pending.style.display = 'block';
        if (active) active.style.display = 'none';
        return;
    }
    
    // Check if membership is purchased
    if (userData.isPaid === true && userData.paymentStatus === 'completed') {
        // Show active status
        if (pending) pending.style.display = 'none';
        if (active) active.style.display = 'block';
        
        // Display plan details
        if (userData.plan) {
            document.getElementById('membershipPlanName').textContent = userData.plan.name;
            document.getElementById('membershipPlanPrice').textContent = '₹' + userData.plan.price + '/month';
        }
        console.log('✅ Membership is active:', userData.plan);
    } else {
        // Show pending status
        if (pending) pending.style.display = 'block';
        if (active) active.style.display = 'none';
        console.log('⏳ Membership is pending');
    }
}

function showMembershipPlan() {
    // Show membership selection section on dashboard (not modal)
    const membershipSection = document.getElementById('membershipSelectionSection');
    if (membershipSection) {
        membershipSection.style.display = 'block';
        membershipSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Populate plans on dashboard
    populateMembershipPlansOnDashboard();
}

function populateMembershipPlansOnDashboard() {
    const container = document.getElementById('membershipPlansGridOnDashboard');
    if (!container) return;

    container.innerHTML = membershipPlans.map((plan, index) => `
        <div class="col-md-4 mb-3">
            <div class="card h-100" style="border: 2px solid #ccc; position: relative; overflow: hidden; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(40, 167, 69, 0.02) 100%);">
                ${index === 1 ? '<div style="position: absolute; top: -10px; right: 10px; background: #ffc107; color: black; padding: 5px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; z-index: 1;">⭐ POPULAR</div>' : ''}
                <div class="card-header bg-success text-white text-center py-3" style="border: none;">
                    <h3 style="font-size: 32px; margin: 0;">${plan.emoji}</h3>
                    <h5 class="mt-2 mb-1">${plan.name}</h5>
                    <h2 class="mb-0" style="color: white;">₹${plan.price}</h2>
                    <small>/${plan.duration}</small>
                </div>
                <div class="card-body">
                    <ul class="list-unstyled">
                        ${plan.features.map(feature => `<li class="mb-2"><i class="fas fa-check text-success"></i> <small>${feature}</small></li>`).join('')}
                    </ul>
                </div>
                <div class="card-footer bg-light">
                    <button class="btn btn-success w-100" onclick="buyMembership('${plan.type}', ${plan.price}, '${plan.name}')">
                        <i class="fas fa-shopping-cart"></i> Select Plan
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function buyMembership(planType, price, planName) {
    const userData = JSON.parse(localStorage.getItem('fitnesshub_user'));
    
    if (!userData) {
        showAlert('❌ User data not found. Please login again.', 'danger');
        return;
    }
    
    // Store the selected plan info (don't mark as paid yet)
    userData.selectedPlan = {
        type: planType,
        name: planName,
        price: price
    };
    
    // Save to localStorage
    localStorage.setItem('fitnesshub_user', JSON.stringify(userData));
    
    console.log('✅ Selected plan:', planName, '- Showing payment window');
    
    // Hide membership selection section
    const membershipSection = document.getElementById('membershipSelectionSection');
    if (membershipSection) {
        membershipSection.style.display = 'none';
    }
    
    // Show payment window modal
    setTimeout(() => {
        try {
            showPaymentWindow();
        } catch (e) {
            console.error('Error showing payment window:', e);
        }
    }, 300);
}

// ============================================
// PAYMENT REMINDER
// ============================================

function setupPaymentReminder() {
    const userData = localStorage.getItem('fitnesshub_user');
    if (!userData) return;

    const user = JSON.parse(userData);
    const regDate = new Date(user.registrationDate);
    const nextPaymentDate = new Date(regDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const daysUntilPayment = Math.ceil((nextPaymentDate - new Date()) / (1000 * 60 * 60 * 24));

    if (daysUntilPayment <= 5 && daysUntilPayment > 0) {
        const notificationManager = new NotificationManager();
        notificationManager.addNotification(
            'Membership Renewal',
            `Your membership renews in ${daysUntilPayment} days. Click to renew now.`,
            'warning'
        );
    }
}

// Call on page load
setupPaymentReminder();
