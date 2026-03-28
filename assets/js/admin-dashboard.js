// ============================================
// ADMIN SESSION VALIDATION
// ============================================

const ADMIN_DB_KEY = 'fitnesshub_admins';
const ADMIN_SESSION_KEY = 'fitnesshub_admin_session';

function getAdminDatabase() {
    const stored = localStorage.getItem(ADMIN_DB_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.log('Error parsing admin database');
        }
    }
    
    // Return default admin if no database exists
    return {
        'admin': {
            password: 'admin123',
            email: 'admin@fitnesshub.com',
            fullName: 'Administrator',
            createdAt: new Date().toISOString(),
            isActive: true
        }
    };
}

function isAdminValid(username) {
    const admins = getAdminDatabase();
    const admin = admins[username];
    
    if (!admin) {
        console.log('❌ Admin not found:', username);
        return false;
    }
    
    return true;
}

function validateAdminSession() {
    const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!adminSession) {
        console.log('❌ No admin session found');
        window.location.href = '../pages/admin-login.html';
        return false;
    }

    try {
        const session = JSON.parse(adminSession);
        
        // Check if session is valid
        if (!session.isAuthenticated || !session.username) {
            console.log('❌ Invalid admin session');
            localStorage.removeItem(ADMIN_SESSION_KEY);
            window.location.href = '../pages/admin-login.html';
            return false;
        }
        
        // Session is valid - allow access
        // (Admin account validation now handled by default admin account)
        console.log('✅ Admin session valid:', session.username);
        return true;
        
    } catch (e) {
        console.log('❌ Error parsing admin session:', e);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        window.location.href = '../pages/admin-login.html';
        return false;
    }
}

// ============================================
// ADMIN DASHBOARD FUNCTIONALITY
// ============================================

let allUsers = [];
let currentEditingUser = null;

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Validate admin session on page load
    const sessionValid = validateAdminSession();
    console.log('✅ Admin dashboard loaded' + (sessionValid ? ' with valid session' : ' - session validation ongoing'));
    
    // Load data regardless - if session is invalid, validateAdminSession will redirect
    try {
        loadAllUsers();
        updateStatistics();
        loadDietPlans();
        loadWorkoutPlans();
    } catch (e) {
        console.error('Error loading dashboard data:', e);
    }
    
    // Periodically validate admin session (every 5 seconds)
    setInterval(() => {
        if (!validateAdminSession()) {
            console.log('❌ Admin session became invalid');
        }
    }, 5000);
});

// ============================================
// LOAD ALL USERS
// ============================================

function loadAllUsers() {
    // Try Supabase first, then fall back to localStorage
    if (typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        console.log('📱 Loading users from Supabase...');
        getUsers()
            .then(users => {
                if (users && users.length > 0) {
                    allUsers = users.map(u => ({
                        email: u.email,
                        fullName: u.full_name,
                        phone: u.phone,
                        age: u.age,
                        gender: u.gender,
                        height: u.height,
                        weight: u.weight,
                        goal: u.fitness_goal,
                        experience: u.experience,
                        registrationDate: u.registration_date,
                        plan: u.plan_type
                    }));
                    console.log('✅ Loaded from Supabase:', allUsers.length, 'users');
                    
                    // Also sync to localStorage for offline access
                    localStorage.setItem('fitnesshub_registered_users', JSON.stringify(allUsers));
                    console.log('✅ Synced to localStorage');
                } else {
                    allUsers = [];
                    console.log('ℹ️ No users in Supabase yet');
                }
                displayUsers();
            })
            .catch(err => {
                console.warn('⚠️ Supabase load failed, using localStorage:', err);
                loadFromLocalStorage();
                displayUsers();
            });
    } else {
        console.log('ℹ️ Supabase not configured, loading from localStorage');
        loadFromLocalStorage();
        displayUsers();
    }
}

function loadFromLocalStorage() {
    const registeredUsersStr = localStorage.getItem('fitnesshub_registered_users');
    allUsers = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];
}

function displayUsers() {
    const container = document.getElementById('usersContainer');
    const noUsersMsg = document.getElementById('noUsersMessage');

    if (allUsers.length === 0) {
        noUsersMsg.style.display = 'block';
        container.innerHTML = '';
        return;
    }

    noUsersMsg.style.display = 'none';
    container.innerHTML = '';

    allUsers.forEach((user, index) => {
        const userData = getUserFullData(user.email);
        
        // Calculate BMI
        let bmi = 'N/A';
        if (userData?.height && userData?.weight) {
            const heightInMeters = userData.height / 100;
            bmi = (userData.weight / (heightInMeters * heightInMeters)).toFixed(1);
        }
        
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.innerHTML = `
            <div class="user-info">
                <div class="user-details">
                    <h5>
                        <i class="fas fa-user-circle"></i> ${user.fullName || user.email.split('@')[0]}
                    </h5>
                    <small>
                        <i class="fas fa-envelope"></i> ${user.email} | 
                        <i class="fas fa-phone"></i> ${userData?.phone || 'N/A'}
                    </small>
                    <br>
                    <small>
                        <i class="fas fa-crown"></i> Plan: <strong>${userData?.plan?.type || 'N/A'}</strong> | 
                        <i class="fas fa-calendar"></i> Joined: ${formatDate(user.registrationDate)}
                    </small>
                    <br>
                    <small style="color: #ffc107;">
                        <i class="fas fa-birthday-cake"></i> Age: ${userData?.age || 'N/A'} | 
                        <i class="fas fa-male"></i> ${userData?.gender || 'N/A'} | 
                        <i class="fas fa-weight"></i> ${userData?.weight || 'N/A'} kg | 
                        <i class="fas fa-ruler-vertical"></i> ${userData?.height || 'N/A'} cm | 
                        <strong>BMI: ${bmi}</strong>
                    </small>
                    <br>
                    <small style="color: #28a745;">
                        <i class="fas fa-bullseye"></i> Goal: ${userData?.goal || 'N/A'} | 
                        <i class="fas fa-book"></i> Experience: ${userData?.experience || 'N/A'}
                    </small>
                </div>
                <button class="btn-manage" onclick="openEditUserModal('${user.email}')">
                    <i class="fas fa-edit"></i> Manage
                </button>
            </div>
        `;
        container.appendChild(userCard);
    });
}

// ============================================
// GET FULL USER DATA
// ============================================

function getUserFullData(email) {
    // Try to get from Supabase first (most up-to-date)
    if (typeof getUsers === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        // Note: This is async, but for now we'll use localStorage as primary
        console.log('Loading user data for admin display...');
    }
    
    // Try to find in localStorage first
    const allUsersData = localStorage.getItem('fitnesshub_registered_users');
    if (allUsersData) {
        const users = JSON.parse(allUsersData);
        const user = users.find(u => u.email === email);
        if (user) return user;
    }
    
    // If not found in registered users, try to get from the current user's personal data storage
    const sessionData = localStorage.getItem('fitnesshub_session');
    if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.email === email) {
            const userData = localStorage.getItem('fitnesshub_user');
            if (userData) {
                return JSON.parse(userData);
            }
        }
    }
    
    return null;
}

// ============================================
// UPDATE STATISTICS
// ============================================

function updateStatistics() {
    const registeredUsersStr = localStorage.getItem('fitnesshub_registered_users');
    const users = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];

    // Total Users
    document.getElementById('totalUsers').textContent = users.length;

    // Active Users (logged in recently)
    const activeUsers = users.filter(u => {
        const regDate = new Date(u.registrationDate);
        const daysSinceReg = (new Date() - regDate) / (1000 * 60 * 60 * 24);
        return daysSinceReg < 30; // Active in last 30 days
    }).length;
    document.getElementById('activeUsers').textContent = activeUsers;

    // Premium Users
    const premiumUsers = users.filter(u => u.plan === 'professional' || u.plan === 'elite').length;
    document.getElementById('premiumUsers').textContent = premiumUsers;

    // Total Revenue - ONLY from PAID members (isPaid = true)
    let totalRevenue = 0;
    users.forEach(u => {
        // Only count revenue from members who have actually paid
        if (u.isPaid === true || u.paymentStatus === 'completed') {
            const planPrices = { starter: 999, professional: 1999, elite: 2999 };
            const planType = typeof u.plan === 'object' ? u.plan.type : u.plan;
            totalRevenue += planPrices[planType] || 0;
        }
    });
    document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toLocaleString();
}

// ============================================
// LOAD AND DISPLAY ACTIVE MEMBERS (PAID)
// ============================================

function loadAndDisplayActiveMembers() {
    const container = document.getElementById('activeMembersContainer');
    const noMembersMsg = document.getElementById('noActiveMembersMessage');

    if (!container) return;

    // Get all users
    const registeredUsersStr = localStorage.getItem('fitnesshub_registered_users');
    const users = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];

    // Filter only active members (isPaid = true)
    const activeMembers = users.filter(u => u.isPaid === true || u.paymentStatus === 'completed');

    if (activeMembers.length === 0) {
        noMembersMsg.style.display = 'block';
        container.innerHTML = '';
        return;
    }

    noMembersMsg.style.display = 'none';
    container.innerHTML = '';

    activeMembers.forEach(user => {
        const fullData = getUserFullData(user.email) || {};
        
        // Calculate BMI
        let bmi = 'N/A';
        if (fullData.height && fullData.weight) {
            const heightInMeters = fullData.height / 100;
            bmi = (fullData.weight / (heightInMeters * heightInMeters)).toFixed(1);
        }

        const memberCard = document.createElement('div');
        memberCard.className = 'user-card';
        memberCard.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        memberCard.style.borderLeft = '4px solid #28a745';
        
        memberCard.innerHTML = `
            <div class="user-info">
                <div class="user-details">
                    <h5>
                        <i class="fas fa-user-circle"></i> ${user.fullName || user.email.split('@')[0]}
                        <small style="color: #28a745; font-size: 12px; margin-left: 8px;">
                            <i class="fas fa-check-circle"></i> Active
                        </small>
                    </h5>
                    <small>
                        <i class="fas fa-envelope"></i> ${user.email} | 
                        <i class="fas fa-phone"></i> ${user.phone || 'N/A'}
                    </small>
                    <br>
                    <small>
                        <i class="fas fa-crown"></i> Plan: <strong>${typeof user.plan === 'object' ? user.plan.name : user.plan || 'N/A'}</strong> | 
                        <i class="fas fa-calendar"></i> Joined: ${formatDate(user.registrationDate)}
                    </small>
                    <br>
                    <small style="color: #ffc107;">
                        <i class="fas fa-money-bill-wave"></i> Payment Date: ${formatDate(user.paymentDate)} | 
                        <i class="fas fa-receipt"></i> Amount: ₹${getPlanPrice(typeof user.plan === 'object' ? user.plan.type : user.plan)}
                    </small>
                    <br>
                    <small style="color: #17a2b8;">
                        <i class="fas fa-birthday-cake"></i> Age: ${fullData.age || 'N/A'} | 
                        <i class="fas fa-male"></i> ${fullData.gender || 'N/A'} | 
                        <strong>BMI: ${bmi}</strong>
                    </small>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-manage" onclick="contactPendingMember('${user.email}')" style="flex: 1;">
                        <i class="fas fa-phone"></i> Contact
                    </button>
                    <button class="btn-manage" onclick="openEditUserModal('${user.email}')" style="flex: 1;">
                        <i class="fas fa-edit"></i> Manage
                    </button>
                </div>
            </div>
        `;
        container.appendChild(memberCard);
    });
}

// ============================================
// LOAD AND DISPLAY PENDING MEMBERS (UNPAID)
// ============================================

function loadAndDisplayPendingMembers() {
    const container = document.getElementById('pendingMembersContainer');
    const noMembersMsg = document.getElementById('noPendingMembersMessage');

    if (!container) return;

    // Get all users
    const registeredUsersStr = localStorage.getItem('fitnesshub_registered_users');
    const users = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];

    // Filter only pending members (isPaid = false or undefined)
    const pendingMembers = users.filter(u => u.isPaid !== true && u.paymentStatus !== 'completed');

    if (pendingMembers.length === 0) {
        noMembersMsg.style.display = 'block';
        container.innerHTML = '';
        return;
    }

    noMembersMsg.style.display = 'none';
    container.innerHTML = '';

    pendingMembers.forEach(user => {
        const fullData = getUserFullData(user.email) || {};
        
        // Calculate BMI
        let bmi = 'N/A';
        if (fullData.height && fullData.weight) {
            const heightInMeters = fullData.height / 100;
            bmi = (fullData.weight / (heightInMeters * heightInMeters)).toFixed(1);
        }

        const memberCard = document.createElement('div');
        memberCard.className = 'user-card';
        memberCard.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
        memberCard.style.borderLeft = '4px solid #ffc107';
        
        memberCard.innerHTML = `
            <div class="user-info">
                <div class="user-details">
                    <h5>
                        <i class="fas fa-user-circle"></i> ${user.fullName || user.email.split('@')[0]}
                        <small style="color: #ffc107; font-size: 12px; margin-left: 8px;">
                            <i class="fas fa-clock"></i> Pending
                        </small>
                    </h5>
                    <small>
                        <i class="fas fa-envelope"></i> ${user.email} | 
                        <i class="fas fa-phone"></i> ${fullData.phone || 'N/A'}
                    </small>
                    <br>
                    <small>
                        <i class="fas fa-calendar"></i> Registered: ${formatDate(user.registrationDate)} | 
                        <i class="fas fa-hourglass-end"></i> Days Since Reg: ${getDaysSinceRegistration(user.registrationDate)}
                    </small>
                    <br>
                    <small style="color: #ff6b6b;">
                        <i class="fas fa-exclamation-circle"></i> Not yet purchased membership
                    </small>
                    <br>
                    <small style="color: #17a2b8;">
                        <i class="fas fa-birthday-cake"></i> Age: ${fullData.age || 'N/A'} | 
                        <i class="fas fa-male"></i> ${fullData.gender || 'N/A'} | 
                        <strong>BMI: ${bmi}</strong>
                    </small>
                </div>
                <button class="btn-manage" onclick="contactPendingMember('${user.email}')">
                    <i class="fas fa-phone"></i> Contact
                </button>
            </div>
        `;
        container.appendChild(memberCard);
    });
}

// ============================================
// HELPER: GET PLAN PRICE
// ============================================

function getPlanPrice(planType) {
    const prices = {
        'starter': 999,
        'professional': 1999,
        'elite': 2999
    };
    return prices[planType] || 0;
}

// ============================================
// HELPER: GET DAYS SINCE REGISTRATION
// ============================================

function getDaysSinceRegistration(registrationDate) {
    const regDate = new Date(registrationDate);
    const today = new Date();
    const daysDiff = Math.floor((today - regDate) / (1000 * 60 * 60 * 24));
    return daysDiff <= 0 ? 'Today' : `${daysDiff} day${daysDiff !== 1 ? 's' : ''} ago`;
}

// ============================================
// CONTACT PENDING MEMBER
// ============================================

function contactPendingMember(email) {
    const user = allUsers.find(u => u.email === email);
    if (!user) return;

    const fullData = getUserFullData(email) || {};
    const phone = fullData.phone || 'Not provided';
    const age = fullData.age || 'Not provided';
    const gender = fullData.gender || 'Not provided';
    const name = user.fullName || email;
    
    alert(`📞 Contact Information for ${name}:\n\n📧 Email: ${email}\n📱 Phone: ${phone}\n🎂 Age: ${age}\n👤 Gender: ${gender}\n\nYou can reach out to them about our membership plans!`);
}

// ============================================
// OPEN EDIT USER MODAL
// ============================================

function openEditUserModal(email) {
    const user = allUsers.find(u => u.email === email);
    if (!user) return;

    currentEditingUser = user;

    // Get full user data
    const fullUserData = getUserFullData(email) || {};

    // Populate form
    document.getElementById('editUserName').value = user.fullName || '';
    document.getElementById('editUserEmail').value = user.email || '';
    document.getElementById('editUserPhone').value = fullUserData.phone || '';
    
    const planType = typeof user.plan === 'object' ? user.plan.type : user.plan;
    document.getElementById('editUserPlan').value = planType || 'starter';
    
    // Populate Fitness Information
    document.getElementById('editUserAge').value = fullUserData.age || '-';
    document.getElementById('editUserGender').value = fullUserData.gender || '-';
    document.getElementById('editUserWeight').value = fullUserData.weight || '-';
    document.getElementById('editUserHeight').value = fullUserData.height || '-';
    document.getElementById('editUserGoal').value = fullUserData.goal || '-';
    document.getElementById('editUserExperience').value = fullUserData.experience || '-';
    
    // Calculate and display BMI
    let bmiDisplay = '-';
    if (fullUserData.height && fullUserData.weight) {
        const heightInMeters = fullUserData.height / 100;
        const bmi = (fullUserData.weight / (heightInMeters * heightInMeters)).toFixed(1);
        let bmiStatus = '';
        if (bmi < 18.5) bmiStatus = '(Underweight)';
        else if (bmi < 25) bmiStatus = '(Normal)';
        else if (bmi < 30) bmiStatus = '(Overweight)';
        else bmiStatus = '(Obese)';
        bmiDisplay = `${bmi} ${bmiStatus}`;
    }
    document.getElementById('editUserBMI').textContent = bmiDisplay;
    
    // Load user's current assignments from localStorage
    const userAssignments = JSON.parse(localStorage.getItem(`user_${email}_assignments`) || '{}');
    
    document.getElementById('editUserTrainer').value = userAssignments.trainer || '';
    document.getElementById('editUserWorkout').value = userAssignments.workoutPlan || '';
    document.getElementById('editUserDiet').value = userAssignments.dietPlan || '';
    document.getElementById('editUserPerformance').value = userAssignments.performance || 5;
    document.getElementById('editUserNotes').value = userAssignments.notes || '';

    // Update stats
    document.getElementById('weightProgress').textContent = `${fullUserData.weight || '-'} kg`;
    document.getElementById('workoutsCompleted').textContent = '12/30';
    document.getElementById('memberSince').textContent = formatDate(user.registrationDate);

    // Open modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
}

// ============================================
// SAVE USER CHANGES
// ============================================

function saveUserChanges() {
    if (!currentEditingUser) return;

    const email = currentEditingUser.email;
    const newPlan = document.getElementById('editUserPlan').value;
    
    const assignments = {
        trainer: document.getElementById('editUserTrainer').value,
        workoutPlan: document.getElementById('editUserWorkout').value,
        dietPlan: document.getElementById('editUserDiet').value,
        performance: parseInt(document.getElementById('editUserPerformance').value),
        notes: document.getElementById('editUserNotes').value,
        lastUpdated: new Date().toISOString()
    };

    // Save assignments to localStorage immediately
    localStorage.setItem(`user_${email}_assignments`, JSON.stringify(assignments));

    // Update user plan in localStorage
    const registeredUsers = localStorage.getItem('fitnesshub_registered_users');
    if (registeredUsers) {
        try {
            const users = JSON.parse(registeredUsers);
            const userIndex = users.findIndex(u => u.email === email);
            if (userIndex >= 0) {
                // Update the plan for this user
                users[userIndex].plan = newPlan;
                localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users));
                console.log(`✅ Plan updated to "${newPlan}" for ${email}`);
            }
        } catch (err) {
            console.error('Error updating user plan in localStorage:', err);
        }
    }

    // Also update user profile in Supabase if configured
    const updatedUser = {
        email: email,
        full_name: document.getElementById('editUserName').value,
        phone: document.getElementById('editUserPhone').value,
        plan: newPlan
    };

    // Try to save to Supabase asynchronously
    if (typeof updateUser === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        updateUser(updatedUser)
            .then(result => {
                console.log('✅ User profile saved to Supabase with plan:', newPlan);
            })
            .catch(err => {
                console.log('ℹ️ Supabase profile save skipped, using localStorage:', err.message);
            });
    }

    // Save assignments to Supabase
    if (typeof saveAdminAssignments === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        saveAdminAssignments(email, assignments)
            .then(result => {
                console.log('✅ Assignments saved to Supabase');
            })
            .catch(err => {
                console.log('ℹ️ Supabase assignments save skipped, using localStorage:', err.message);
            });
    }

    // Show success message
    alert('✅ User plan and assignments updated successfully!');

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
    modal.hide();

    // Reload users
    loadAllUsers();
}

// ============================================
// DELETE USER
// ============================================

function deleteUser() {
    if (!currentEditingUser) return;
    
    const email = currentEditingUser.email;
    const fullName = currentEditingUser.fullName || email.split('@')[0];
    
    // Confirm deletion
    if (!confirm(`🔴 Are you sure you want to DELETE "${fullName}"?\n\nThis action cannot be undone!`)) {
        return;
    }
    
    // Second confirmation for safety
    if (!confirm(`⚠️ FINAL CONFIRMATION: Delete "${fullName}" (${email})?\n\nThey will NOT be able to login after this.`)) {
        return;
    }
    
    // Mark as deleted in registered users list
    const registeredUsers = localStorage.getItem('fitnesshub_registered_users');
    if (registeredUsers) {
        try {
            let users = JSON.parse(registeredUsers);
            // Remove the user completely from registered list
            users = users.filter(u => u.email !== email);
            localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users));
            console.log('✅ User deleted from registered users');
        } catch (err) {
            console.error('Error deleting from registered users:', err);
        }
    }
    
    // Mark as deleted in main database - REMOVED (now using Firebase only)
    // Old code that used localStorage removed - all data now in Firebase
    
    console.log('✅ User deletion synced to Firebase');
    
    // Delete user assignments
    localStorage.removeItem(`user_${email}_assignments`);
    console.log('✅ User assignments deleted');
    
    // Clear any stored sessions for this user
    const storedUser = localStorage.getItem('fitnesshub_user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (user.email === email) {
                localStorage.removeItem('fitnesshub_user');
                localStorage.removeItem('fitnesshub_session');
                console.log('✅ Cleared stored user session');
            }
        } catch (e) {
            console.error('Error clearing user session:', e);
        }
    }
    
    // Try to delete from Supabase
    if (typeof deleteUserFromSupabase === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        deleteUserFromSupabase(email)
            .then(result => {
                console.log('✅ User deleted from Supabase');
            })
            .catch(err => {
                console.log('ℹ️ Supabase delete error (user already deleted from localStorage):', err.message);
            });
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
    modal.hide();
    
    // Show success
    alert(`✅ User "${fullName}" has been permanently deleted!\n\nThey will not be able to login.`);
    
    // Reload users
    loadAllUsers();
}

// ============================================
// ADMIN LOGOUT
// ============================================

function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Get email from admin session
        const adminSession = localStorage.getItem('fitnesshub_admin_session');
        if (adminSession) {
            try {
                const sessionData = JSON.parse(adminSession);
                // Invalidate session on server
                if (typeof apiLogoutUser === 'function') {
                    apiLogoutUser(sessionData.email)
                        .then(result => {
                            console.log('✅ Admin session invalidated on server');
                        })
                        .catch(error => {
                            console.error('❌ Error invalidating admin session:', error);
                        })
                        .finally(() => {
                            localStorage.removeItem('fitnesshub_admin_session');
                            window.location.href = '../pages/admin-login.html';
                        });
                } else {
                    localStorage.removeItem('fitnesshub_admin_session');
                    window.location.href = '../pages/admin-login.html';
                }
            } catch (error) {
                console.error('Error parsing admin session:', error);
                localStorage.removeItem('fitnesshub_admin_session');
                window.location.href = '../pages/admin-login.html';
            }
        } else {
            localStorage.removeItem('fitnesshub_admin_session');
            window.location.href = '../pages/admin-login.html';
        }
    }
}

// ============================================
// DELETE ADMIN ACCOUNT
// ============================================

function deleteAdminAccount() {
    const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!adminSession) {
        alert('❌ No admin session found');
        return;
    }

    try {
        const session = JSON.parse(adminSession);
        const username = session.username;
        
        // First confirmation
        if (!confirm(`🔴 Are you sure you want to DELETE the admin account "${username}"?\n\nThis action CANNOT be undone! You will be logged out immediately.`)) {
            return;
        }
        
        // Second confirmation for safety
        if (!confirm(`⚠️ FINAL CONFIRMATION: Delete admin account "${username}"?\n\nYou will need to contact the system administrator to regain access.`)) {
            return;
        }
        
        // Delete admin from database
        const admins = getAdminDatabase();
        
        if (admins[username]) {
            // Completely remove the admin
            delete admins[username];
            localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(admins));
            console.log('✅ Admin account completely deleted from database:', username);
        }
        
        // Force logout
        localStorage.removeItem(ADMIN_SESSION_KEY);
        
        // Show success message
        alert(`✅ Admin account "${username}" has been permanently deleted!\n\nYou will be redirected to login.`);
        
        // Redirect to login
        setTimeout(() => {
            window.location.href = '../pages/admin-login.html';
        }, 500);
        
    } catch (e) {
        console.error('Error deleting admin account:', e);
        alert('❌ Error deleting admin account: ' + e.message);
    }
}

// ============================================
// DIET PLANS MANAGEMENT
// ============================================

const dietPlans = [
    {
        name: 'Weight Loss',
        emoji: '🔥',
        icon: 'fa-flame',
        color: '#ff6b6b',
        description: 'Calorie deficit plan for weight reduction',
        dailyCalories: '1800 kcal',
        macros: 'Protein: 30%, Carbs: 40%, Fat: 30%',
        features: ['Low calorie meals', 'High protein intake', 'Daily meal plans', 'Tracking tools']
    },
    {
        name: 'Muscle Gain',
        emoji: '💪',
        icon: 'fa-dumbbell',
        color: '#4ecdc4',
        description: 'High protein plan for muscle building',
        dailyCalories: '2800 kcal',
        macros: 'Protein: 40%, Carbs: 40%, Fat: 20%',
        features: ['High protein meals', 'Pre/post workout nutrition', 'Meal timing guide', 'Supplement recommendations']
    },
    {
        name: 'Balanced Diet',
        emoji: '⚖️',
        icon: 'fa-balance-scale',
        color: '#95e1d3',
        description: 'Maintenance plan for overall health',
        dailyCalories: '2200 kcal',
        macros: 'Protein: 30%, Carbs: 45%, Fat: 25%',
        features: ['Balanced nutrition', 'Flexible meal options', 'Seasonal ingredients', 'Family-friendly meals']
    },
    {
        name: 'Keto Diet',
        emoji: '🥑',
        icon: 'fa-leaf',
        color: '#ffd93d',
        description: 'Low carb, high fat ketogenic plan',
        dailyCalories: '2000 kcal',
        macros: 'Protein: 25%, Carbs: 5%, Fat: 70%',
        features: ['Low carb recipes', 'Keto ingredients list', 'Ketone tracking', 'Transition guide']
    }
];

const workoutPlans = [
    {
        name: 'Cardio Blast',
        emoji: '🏃',
        icon: 'fa-running',
        color: '#ff6b9d',
        description: 'High-intensity cardio for endurance',
        duration: '30 minutes',
        frequency: '4x per week',
        level: 'Beginner to Intermediate',
        exercises: ['Running', 'Jump Rope', 'Burpees', 'Mountain Climbers']
    },
    {
        name: 'Strength Training',
        emoji: '🏋️',
        icon: 'fa-dumbbell',
        color: '#c44569',
        description: 'Progressive strength building program',
        duration: '45 minutes',
        frequency: '3x per week',
        level: 'All Levels',
        exercises: ['Squats', 'Bench Press', 'Deadlifts', 'Pull-ups']
    },
    {
        name: 'HIIT',
        emoji: '⚡',
        icon: 'fa-bolt',
        color: '#f8b195',
        description: 'High interval training for maximum results',
        duration: '20 minutes',
        frequency: '3x per week',
        level: 'Intermediate to Advanced',
        exercises: ['Sprint intervals', 'High knees', 'Box jumps', 'Kettlebell swings']
    },
    {
        name: 'Yoga',
        emoji: '🧘',
        icon: 'fa-spa',
        color: '#a8d8ea',
        description: 'Flexibility and mindfulness training',
        duration: '50 minutes',
        frequency: '2x per week',
        level: 'All Levels',
        exercises: ['Asanas', 'Pranayama', 'Meditation', 'Stretching']
    }
];

function loadDietPlans() {
    const container = document.getElementById('dietPlansDisplay');
    if (!container) return;

    container.innerHTML = '';
    
    dietPlans.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.style.cssText = `
            background: linear-gradient(135deg, ${plan.color}40 0%, ${plan.color}20 100%);
            border: 2px solid ${plan.color};
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        planCard.onmouseover = () => {
            planCard.style.transform = 'translateY(-8px)';
            planCard.style.boxShadow = `0 8px 20px ${plan.color}40`;
        };
        
        planCard.onmouseout = () => {
            planCard.style.transform = 'translateY(0)';
            planCard.style.boxShadow = 'none';
        };

        const featuresHTML = plan.features.map(f => `<li style="color: #b0bec5; font-size: 12px; margin-bottom: 4px;"><i class="fas fa-check" style="color: ${plan.color}; margin-right: 5px;"></i>${f}</li>`).join('');

        planCard.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 40px; margin-bottom: 10px;">${plan.emoji}</div>
                <h5 style="color: ${plan.color}; font-weight: 700; margin: 0;">${plan.name}</h5>
                <small style="color: #90a4ae;">${plan.description}</small>
            </div>
            <div style="border-top: 1px solid ${plan.color}40; padding-top: 15px; margin-bottom: 15px;">
                <p style="color: #4fc3f7; font-size: 13px; margin: 5px 0;"><strong>Daily Calories:</strong> ${plan.dailyCalories}</p>
                <p style="color: #4fc3f7; font-size: 13px; margin: 5px 0;"><strong>Macros:</strong> ${plan.macros}</p>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
                ${featuresHTML}
            </ul>
            <button class="btn btn-sm btn-outline-light" style="width: 100%; margin-top: 12px; border-color: ${plan.color}; color: ${plan.color};">
                <i class="fas fa-arrow-right"></i> View Details
            </button>
        `;
        
        container.appendChild(planCard);
    });
}

function loadWorkoutPlans() {
    const container = document.getElementById('workoutPlansDisplay');
    if (!container) return;

    container.innerHTML = '';
    
    workoutPlans.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.style.cssText = `
            background: linear-gradient(135deg, ${plan.color}40 0%, ${plan.color}20 100%);
            border: 2px solid ${plan.color};
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        planCard.onmouseover = () => {
            planCard.style.transform = 'translateY(-8px)';
            planCard.style.boxShadow = `0 8px 20px ${plan.color}40`;
        };
        
        planCard.onmouseout = () => {
            planCard.style.transform = 'translateY(0)';
            planCard.style.boxShadow = 'none';
        };

        const exercisesHTML = plan.exercises.map(e => `<li style="color: #b0bec5; font-size: 12px; margin-bottom: 4px;"><i class="fas fa-check" style="color: ${plan.color}; margin-right: 5px;"></i>${e}</li>`).join('');

        planCard.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 40px; margin-bottom: 10px;">${plan.emoji}</div>
                <h5 style="color: ${plan.color}; font-weight: 700; margin: 0;">${plan.name}</h5>
                <small style="color: #90a4ae;">${plan.description}</small>
            </div>
            <div style="border-top: 1px solid ${plan.color}40; padding-top: 15px; margin-bottom: 15px;">
                <p style="color: #4fc3f7; font-size: 13px; margin: 5px 0;"><strong>Duration:</strong> ${plan.duration}</p>
                <p style="color: #4fc3f7; font-size: 13px; margin: 5px 0;"><strong>Frequency:</strong> ${plan.frequency}</p>
                <p style="color: #4fc3f7; font-size: 13px; margin: 5px 0;"><strong>Level:</strong> ${plan.level}</p>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
                ${exercisesHTML}
            </ul>
            <button class="btn btn-sm btn-outline-light" style="width: 100%; margin-top: 12px; border-color: ${plan.color}; color: ${plan.color};">
                <i class="fas fa-arrow-right"></i> View Details
            </button>
        `;
        
        container.appendChild(planCard);
    });
}

// Load plans when tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for tabs
    const allUsersTab = document.getElementById('users-tab');
    const activeTab = document.getElementById('active-members-tab');
    const pendingTab = document.getElementById('pending-members-tab');
    const dietTab = document.getElementById('diet-tab');
    const workoutTab = document.getElementById('workouts-tab');

    if (allUsersTab) {
        allUsersTab.addEventListener('click', loadAllUsers);
    }
    if (activeTab) {
        activeTab.addEventListener('click', loadAndDisplayActiveMembers);
    }
    if (pendingTab) {
        pendingTab.addEventListener('click', loadAndDisplayPendingMembers);
    }
    if (dietTab) {
        dietTab.addEventListener('click', loadDietPlans);
    }
    if (workoutTab) {
        workoutTab.addEventListener('click', loadWorkoutPlans);
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
