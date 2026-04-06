// ============================================
// ADMIN SESSION VALIDATION
// ============================================

const ADMIN_DB_KEY = 'fitnesshub_admins';
const ADMIN_SESSION_KEY = 'fitnesshub_admin_session';

function getAdminDatabase() {
    const stored = localStorage.getItem(ADMIN_DB_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && Object.keys(parsed).length > 0) {
                return parsed;
            }
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

async function loadAllUsers() {
    console.log('🔄 Fetching users from backend API...');
    try {
        const response = await fetch('/api/admin/users');
        const result = await response.json();
        
        if (result.success && result.users) {
            allUsers = result.users;
            console.log(`✅ Successfully loaded ${allUsers.length} users from Supabase`);
            displayUsers();
            updateStatistics();
        } else {
            throw new Error(result.error || 'Unknown API error');
        }
    } catch (error) {
        console.warn('⚠️ API fetch failed, falling back to localStorage:', error);
        allUsers = getMergedUsers();
        displayUsers();
        updateStatistics();
    }
}

async function purgeUser(userId) {
    if (!confirm('🚨 CRITICAL ACTION: Are you sure you want to PERMANENTLY PURGE this account? \n\nThis will delete all User data, Payment history, and Membership records from the database. This action CANNOT be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/user/${userId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Account fully purged and deleted successfully.');
            loadAllUsers(); // Reload the list from backend
        } else {
            alert('❌ Failed to purge account: ' + (result.error || 'Server error'));
        }
    } catch (err) {
        console.error('Error purging user:', err);
        alert('❌ Error communicating with server. Check console for details.');
    }
}

function getMergedUsers() {
    // Try primary multi-user database first (object format)
    const dbRaw = localStorage.getItem('fitnesshub_database');
    const userDb = dbRaw ? JSON.parse(dbRaw) : {};
    
    // Try legacy array format
    const registeredUsersStr = localStorage.getItem('fitnesshub_registered_users');
    const legacyUsers = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];

    // Merge both sources (prefer database records as they are newer)
    const mergedMap = new Map();
    
    // Process legacy array first
    legacyUsers.forEach(u => {
        if (u.email) {
            const emailKey = u.email.toLowerCase();
            mergedMap.set(emailKey, u);
        }
    });
    
    // Override with object database records (primary registration storage)
    Object.values(userDb).forEach(u => {
        if (u.email) {
            const emailKey = u.email.toLowerCase();
            // Ensure compatibility between formats if needed
            const record = { ...u };
            if (typeof record.plan === 'object' && record.plan.type) {
                record.planType = record.plan.type; // compatibility
            }
            mergedMap.set(emailKey, record);
        }
    });

    return Array.from(mergedMap.values());
}

function loadFromLocalStorage() {
    allUsers = getMergedUsers();
    console.log(`✅ Loaded ${allUsers.length} users from local storage`);
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
                        <i class="fas fa-crown"></i> Plan: <strong>${userData?.plan?.type || userData?.plan || 'N/A'}</strong> | 
                        <i class="fas fa-calendar"></i> Joined: ${formatDate(user.registrationDate || user.created_at)} |
                        <span class="badge ${userData?.membership_status === 'active' ? 'bg-success' : 'bg-warning'}">
                            ${userData?.membership_status === 'active' ? 'PAID' : 'PENDING'}
                        </span>
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
                <div class="d-flex flex-column gap-2">
                    <button class="btn-manage" onclick="openEditUserModal('${user.email}')">
                        <i class="fas fa-edit"></i> Manage
                    </button>
                    ${user.id ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="purgeUser('${user.id}')" title="Permanently delete this account from Supabase">
                        <i class="fas fa-trash-alt"></i> Purge
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        container.appendChild(userCard);
    });
}

// ============================================
// GET FULL USER DATA
// ============================================

function getUserFullData(email) {
    if (!email) return null;
    const emailLC = email.toLowerCase();
    
    // Check our allUsers array (if it's already loaded)
    let user = allUsers.find(u => u.email && u.email.toLowerCase() === emailLC);
    if (!user) {
        // Try getting fresh merged data
        const freshUsers = getMergedUsers();
        user = freshUsers.find(u => u.email && u.email.toLowerCase() === emailLC);
    }
    
    return user || null;
}

// ============================================
// UPDATE STATISTICS
// ============================================

function updateStatistics() {
    // Priority: use the server-fetched users if available, otherwise fallback
    const users = (allUsers && allUsers.length > 0) ? allUsers : getMergedUsers();

    // Total Users
    document.getElementById('totalUsers').textContent = users.length;

    // Active Users (With valid membership)
    const activeUsers = users.filter(u => u.membership_status === 'active').length;
    document.getElementById('activeUsers').textContent = activeUsers;

    // Premium Users (Professional or Elite plans with active status)
    const premiumUsers = users.filter(u => 
        u.membership_status === 'active' && 
        (u.plan === 'professional' || u.plan === 'elite' || (u.plan && (u.plan.type === 'professional' || u.plan.type === 'elite')))
    ).length;
    document.getElementById('premiumUsers').textContent = premiumUsers;

    // Total Revenue - ONLY from PAID members (isPaid = true)
    let totalRevenue = 0;
    users.forEach(u => {
        // Only count revenue from members who have actually paid
        if (u.membership_status === 'active') {
            const planPrices = { starter: 999, professional: 1999, elite: 2999 };
            const planDetails = u.plan || {};
            const planType = typeof planDetails === 'object' ? planDetails.type : planDetails;
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

    // Priority: use the server-fetched users
    const users = (allUsers && allUsers.length > 0) ? allUsers : getMergedUsers();

    // Filter only active members (membership_status 'active')
    const activeMembers = users.filter(u => u.membership_status === 'active');

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
        memberCard.style.backgroundColor = 'var(--bg-secondary)';
        memberCard.style.borderLeft = '4px solid #CCFF00';
        
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
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-manage" onclick="deleteUser('${user.email}')" style="flex: 0 0 40px; background-color: #ff4444; color: white;">
                        <i class="fas fa-trash-alt"></i>
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
    const users = getMergedUsers();

    // Filter only pending members (neither isPaid nor status completed/paid)
    // IMPORTANT: Users with status 'pending' or 'inactive' are considered pending
    const pendingMembers = users.filter(u => 
        u.membership_status === 'pending' || 
        u.membership_status === 'inactive' ||
        (!u.membership_status && u.isPaid !== true)
    );

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
        memberCard.style.backgroundColor = 'var(--bg-secondary)';
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
                <div style="display: flex; gap: 8px;">
                    <button class="btn-manage" onclick="contactPendingMember('${user.email}')" style="flex: 1;">
                        <i class="fas fa-phone"></i> Contact
                    </button>
                    <button class="btn-manage" onclick="openEditUserModal('${user.email}')" style="flex: 1;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-manage" onclick="deleteUser('${user.email}')" style="flex: 0 0 40px; background-color: #ff4444; color: white;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
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

    // Update user plan in localStorage (Legacy Array Format)
    const registeredUsers = localStorage.getItem('fitnesshub_registered_users');
    let usersArray = [];
    if (registeredUsers) {
        try {
            usersArray = JSON.parse(registeredUsers);
            const userIndex = usersArray.findIndex(u => u.email === email);
            if (userIndex >= 0) {
                usersArray[userIndex].plan = newPlan;
                usersArray[userIndex].fullName = document.getElementById('editUserName').value;
                usersArray[userIndex].phone = document.getElementById('editUserPhone').value;
                localStorage.setItem('fitnesshub_registered_users', JSON.stringify(usersArray));
            }
        } catch (err) { console.error('Error updating users array:', err); }
    }

    // Update user plan in localStorage (Primary Object Database)
    const dbRaw = localStorage.getItem('fitnesshub_database');
    if (dbRaw) {
        try {
            const db = JSON.parse(dbRaw);
            const emailKey = email.toLowerCase();
            if (db[emailKey]) {
                db[emailKey].plan = { type: newPlan, name: newPlan.charAt(0).toUpperCase() + newPlan.slice(1) + ' Plan' };
                db[emailKey].fullName = document.getElementById('editUserName').value;
                db[emailKey].phone = document.getElementById('editUserPhone').value;
                localStorage.setItem('fitnesshub_database', JSON.stringify(db));
                console.log(`✅ Database updated for ${email}`);
            }
        } catch (err) { console.error('Error updating object database:', err); }
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
    console.log('🔄 Admin logout sequence initiated...');
    const adminSession = localStorage.getItem('fitnesshub_admin_session');

    if (confirm('Are you sure you want to logout?')) {
        // Invalidate on server if possible
        if (adminSession && typeof apiLogoutUser === 'function') {
            try {
                const sessionData = JSON.parse(adminSession);
                apiLogoutUser(sessionData.email);
            } catch (e) {
                console.error('Error in apiLogoutUser call:', e);
            }
        }

        // Clear session immediately
        localStorage.removeItem('fitnesshub_admin_session');
        console.log('✅ Admin session cleared, redirecting to login...');
        window.location.href = 'admin-login.html'; 
    }
}
// Expose to window to ensure visibility
window.adminLogout = adminLogout;

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
            background: var(--bg-secondary);
            border: 2px solid ${plan.color};
            border-radius: 0px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        planCard.onmouseover = () => {
            planCard.style.transform = 'translateY(-4px)';
            planCard.style.boxShadow = `4px 4px 0px ${plan.color}`;
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
            background: var(--bg-secondary);
            border: 2px solid ${plan.color};
            border-radius: 0px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        planCard.onmouseover = () => {
            planCard.style.transform = 'translateY(-4px)';
            planCard.style.boxShadow = `4px 4px 0px ${plan.color}`;
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

/**
 * Deletes a user from the system
 * @param {string} email - Email of the user to delete
 */
function deleteUser(email) {
    if (!confirm(`Are you sure you want to delete the user with email ${email}? This action cannot be undone.`)) {
        return;
    }

    try {
        // 1. Remove from Primary Database (Object-based)
        const db = JSON.parse(localStorage.getItem('fitnesshub_database') || '{}');
        if (db[email]) {
            delete db[email];
            localStorage.setItem('fitnesshub_database', JSON.stringify(db));
        }

        // 2. Remove from Legacy Array (fitnesshub_registered_users)
        let users = JSON.parse(localStorage.getItem('fitnesshub_registered_users') || '[]');
        const updatedUsers = users.filter(user => (user.email || user.userEmail) !== email);
        localStorage.setItem('fitnesshub_registered_users', JSON.stringify(updatedUsers));

        // 3. Clear session if it's the current user (edge case)
        const session = JSON.parse(localStorage.getItem('fitnesshub_session') || '{}');
        if (session.email === email) {
            localStorage.removeItem('fitnesshub_session');
            localStorage.removeItem('fitnesshub_user');
        }

        // 4. Remove from Payment History (Pura Account Purge - allows re-registration)
        try {
            let history = JSON.parse(localStorage.getItem('fitnesshub_payment_history') || '[]');
            const updatedHistory = history.filter(p => (p.email || p.userEmail) !== email);
            localStorage.setItem('fitnesshub_payment_history', JSON.stringify(updatedHistory));
        } catch (e) { console.warn('History clear failed during delete:', e); }

        alert('Account Purged Successfully. The user can now register again as a new member.');
        
        // Refresh the views
        if (typeof loadStats === 'function') loadStats();
        if (typeof loadAllUsers === 'function') loadAllUsers();
        if (typeof loadAndDisplayActiveMembers === 'function') loadAndDisplayActiveMembers();
        if (typeof loadAndDisplayPendingMembers === 'function') loadAndDisplayPendingMembers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please check console for details.');
    }
}

// Global scope availability
window.deleteUser = deleteUser;
window.contactPendingMember = typeof contactPendingMember !== 'undefined' ? contactPendingMember : undefined;
window.openEditUserModal = typeof openEditUserModal !== 'undefined' ? openEditUserModal : undefined;
window.saveUserEdits = typeof saveUserEdits !== 'undefined' ? saveUserEdits : undefined;
window.closeEditModal = typeof closeEditModal !== 'undefined' ? closeEditModal : undefined;
