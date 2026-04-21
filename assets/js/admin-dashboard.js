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
            loadAndDisplayActiveMembers();
            loadAndDisplayPendingMembers();
            updateStatistics();
        } else {
            throw new Error(result.error || 'Unknown API error');
        }
    } catch (error) {
        console.warn('⚠️ API fetch failed, falling back to localStorage:', error);
        allUsers = getMergedUsers();
        displayUsers();
        loadAndDisplayActiveMembers();
        loadAndDisplayPendingMembers();
        updateStatistics();
    }
}



function getMergedUsers() {
    // Legacy localStorage fallback removed — Supabase is the sole source of truth
    // If the API call fails, return empty array
    console.warn('⚠️ getMergedUsers called as fallback — no localStorage data available');
    return [];
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
                        <span class="badge ${userData?.membership_status === 'active' || user.isPaid ? 'bg-success' : 'bg-warning'}">
                            ${userData?.membership_status === 'active' || user.isPaid ? 'PAID' : 'PENDING'}
                        </span>
                        ${userData?.membership_status === 'active' || user.isPaid ? `<br><strong style="color: #28a745; display: inline-block; margin-top: 5px;"><i class="fas fa-money-bill-wave"></i> Total Payment: ₹${getPlanPrice(userData?.plan?.type || userData?.plan)}</strong>` : ''}
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
                <div class="d-flex">
                    <button class="btn-manage flex-grow-1" onclick="openEditUserModal('${user.email}')">
                        <i class="fas fa-edit"></i> MANAGE
                    </button>
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
        if (u.membership_status === 'active' || u.isPaid) {
            let planStr = '';
            if (typeof u.plan === 'object' && u.plan) {
                planStr = (u.plan.type || u.plan.name || '').toLowerCase();
            } else if (typeof u.plan === 'string') {
                planStr = u.plan.toLowerCase();
            }
            
            if (planStr.includes('starter')) totalRevenue += 999;
            else if (planStr.includes('professional')) totalRevenue += 1999;
            else if (planStr.includes('elite')) totalRevenue += 2999;
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

    // Filter only active members (membership_status 'active' or legacy isPaid true)
    const activeMembers = users.filter(u => u.membership_status === 'active' || u.isPaid === true);

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
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <button class="btn-manage" onclick="contactPendingMember('${user.email}')" style="flex: 1; background: rgba(34, 211, 238, 0.1); border: 1px solid #22d3ee; color: #22d3ee;">
                        <i class="fas fa-phone"></i> CONTACT
                    </button>
                    <button class="btn-manage" onclick="openEditUserModal('${user.email}')" style="flex: 1;">
                        <i class="fas fa-edit"></i> MANAGE
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
    // Priority: use the server-fetched users if available, otherwise fallback
    const users = (allUsers && allUsers.length > 0) ? allUsers : getMergedUsers();

    // Filter only pending members (neither isPaid nor status completed/paid)
    // IMPORTANT: Users with status 'pending' or 'inactive' are considered pending
    const pendingMembers = users.filter(u => 
        (u.membership_status === 'pending' || u.membership_status === 'inactive' || !u.membership_status) && 
        u.isPaid !== true
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
                        <i class="fas fa-calendar"></i> Registered: ${formatDate(user.registrationDate || user.created_at)} | 
                        <i class="fas fa-hourglass-end"></i> Days Since Reg: ${getDaysSinceRegistration(user.registrationDate || user.created_at)}
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
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <button class="btn-manage" onclick="contactPendingMember('${user.email}')" style="flex: 1; background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; color: #ffc107;">
                        <i class="fas fa-phone"></i> CONTACT
                    </button>
                    <button class="btn-manage" onclick="openEditUserModal('${user.email}')" style="flex: 1;">
                        <i class="fas fa-edit"></i> MANAGE
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
    if (!planType) return 0;
    const pt = String(planType).toLowerCase();
    if (pt.includes('starter')) return 999;
    if (pt.includes('professional')) return 1999;
    if (pt.includes('elite')) return 2999;
    return 0;
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

    // Populate form using user object properties
    const nameInput = document.getElementById('editUserName');
    const emailInput = document.getElementById('editUserEmail');
    const phoneInput = document.getElementById('editUserPhone');
    const planSelect = document.getElementById('editUserPlan');
    
    if (nameInput) nameInput.value = user.fullName || user.full_name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    
    const planType = typeof user.plan === 'object' ? user.plan.type : user.plan;
    if (planSelect) planSelect.value = planType || 'starter';
    
    // Populate Fitness Information
    const ageInput = document.getElementById('editUserAge');
    const genderSelect = document.getElementById('editUserGender');
    const weightInput = document.getElementById('editUserWeight');
    const heightInput = document.getElementById('editUserHeight');
    const goalInput = document.getElementById('editUserGoal');
    const experienceSelect = document.getElementById('editUserExperience');

    if (ageInput) ageInput.value = user.age || '';
    if (genderSelect) genderSelect.value = user.gender || 'Male';
    if (weightInput) weightInput.value = user.weight || '';
    if (heightInput) heightInput.value = user.height || '';
    if (goalInput) goalInput.value = user.goal || '';
    if (experienceSelect) experienceSelect.value = user.experience || 'Beginner';
    
    // Calculate and display BMI
    let bmiDisplay = '-';
    if (user.height && user.weight) {
        const heightInMeters = user.height / 100;
        const bmi = (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
        let bmiStatus = '';
        if (bmi < 18.5) bmiStatus = '(Underweight)';
        else if (bmi < 25) bmiStatus = '(Normal)';
        else if (bmi < 30) bmiStatus = '(Overweight)';
        else bmiStatus = '(Obese)';
        bmiDisplay = `${bmi} ${bmiStatus}`;
    }
    const bmiElement = document.getElementById('editUserBMI');
    if (bmiElement) bmiElement.textContent = bmiDisplay;
    
    const trainerSelect = document.getElementById('editUserTrainer');
    const workoutSelect = document.getElementById('editUserWorkout');
    const dietSelect = document.getElementById('editUserDiet');
    const performanceInput = document.getElementById('editUserPerformance');
    const notesArea = document.getElementById('editUserNotes');

    if (trainerSelect) trainerSelect.value = user.trainer || '';
    if (workoutSelect) workoutSelect.value = user.workout_plan || '';
    if (dietSelect) dietSelect.value = user.diet_plan || '';
    if (performanceInput) performanceInput.value = user.performance || 5;
    if (notesArea) notesArea.value = user.notes || '';

    // Update stats
    const weightProg = document.getElementById('weightProgress');
    const workoutsComp = document.getElementById('workoutsCompleted');
    const memberSinceEl = document.getElementById('memberSince');

    if (weightProg) weightProg.textContent = `${user.weight || '-'} kg`;
    if (workoutsComp) workoutsComp.textContent = '12/30';
    if (memberSinceEl) memberSinceEl.textContent = formatDate(user.registrationDate || user.created_at);

    // Open modal
    const modalElement = document.getElementById('editUserModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// ============================================
// SAVE USER CHANGES
// ============================================

async function saveUserChanges() {
    if (!currentEditingUser) return;

    const email = currentEditingUser.email;
    
    const updateData = {
        full_name: document.getElementById('editUserName').value,
        phone: document.getElementById('editUserPhone').value,
        age: parseInt(document.getElementById('editUserAge').value),
        gender: document.getElementById('editUserGender').value,
        weight: parseFloat(document.getElementById('editUserWeight').value),
        height: parseFloat(document.getElementById('editUserHeight').value),
        goal: document.getElementById('editUserGoal').value,
        experience: document.getElementById('editUserExperience').value,
        plan: document.getElementById('editUserPlan').value,
        assignments: {
            trainer: document.getElementById('editUserTrainer').value,
            workoutPlan: document.getElementById('editUserWorkout').value,
            dietPlan: document.getElementById('editUserDiet').value,
            performance: parseInt(document.getElementById('editUserPerformance').value),
            notes: document.getElementById('editUserNotes').value,
        }
    };

    // Try to save via API
    try {
        // Use apiUpdateUser from api-client.js or fallback to fetch
        const updateFunc = window.apiUpdateUser || (window.apiClient && window.apiClient.updateUser);
        
        if (typeof updateFunc === 'function') {
            const result = await updateFunc(email, updateData);
            if (result.success) {
                alert('User details updated successfully!');
            } else {
                alert('Failed to update user: ' + (result.error || 'Server error'));
            }
        } else {
            // Manual fetch fallback
            const response = await fetch(`/api/admin/user/${encodeURIComponent(email)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const result = await response.json();
            if (result.success) {
                alert('User details updated successfully!');
            } else {
                alert('Failed to update: ' + (result.error || 'Unknown error'));
            }
        }
    } catch (err) {
        console.error('Update User Error:', err);
        alert('An error occurred while updating the user: ' + err.message);
    }

    // Close modal
    const modalEl = document.getElementById('editUserModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
        modal.hide();
    }
    
    // Reload users to show updated data
    loadAllUsers();
}

// ============================================
// DELETE USER
// ============================================

async function deleteUser(emailParam, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    let email = emailParam;
    let fullName = "User";
    let user = null;
    
    console.log('🗑️ Delete request for:', emailParam || 'current editing user');

    if (!email) {
        if (!currentEditingUser) {
            console.error('❌ No user currently being edited for deletion');
            return;
        }
        email = currentEditingUser.email;
        user = currentEditingUser;
    } else {
        user = allUsers.find(u => u.email === email);
    }
    
    if (user) {
        fullName = user.fullName || user.full_name || email.split('@')[0];
    } else {
        // Last ditch attempt to find user by email in allUsers if not already found
        user = allUsers.find(u => u.email === email);
        if (user) fullName = user.fullName || user.full_name || email.split('@')[0];
    }
    
    const userId = user ? (user.id || user.user_id) : null;
    
    console.log('👤 Target user found:', user);
    console.log('🆔 Target User ID:', userId);

    if (!userId) {
        showBrutalistAlert('❌ Cannot delete: User ID not found.', 'error');
        return;
    }

    // Use custom brutalist confirmation instead of native confirm()
    const confirmed = await showBrutalistConfirm(
        `PURGE USER?`,
        `Are you sure you want to completely remove <strong>${fullName}</strong> from the system?<br><br><small class="text-danger">This action permanently deletes all history and cannot be undone.</small>`,
        'PURGE NOW',
        'CANCEL'
    );

    if (!confirmed) return;
    
    
    if (userId) {
        try {
            console.log(`📡 Sending DELETE request for user ID: ${userId}`);
            
            // Try using the window.apiDeleteUser first if available
            const deleteFunc = window.apiDeleteUser || (window.apiClient && window.apiClient.deleteUser);
            
            let success = false;
            let errorMessage = '';

            if (typeof deleteFunc === 'function') {
                const result = await deleteFunc(userId);
                success = result.success;
                errorMessage = result.error || 'Server error';
            } else {
                // Fallback to manual fetch
                const response = await fetch(`/api/admin/user/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });

                const result = await response.json();
                success = result.success;
                errorMessage = result.error || 'Unknown error';
            }
            
            if (success) {
                // If it was from the modal, close the modal first
                const modalElement = document.getElementById('editUserModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                }
                
                showBrutalistAlert('✅ User completely purged from the system.', 'success');
                loadAllUsers(); // Refresh the UI
            } else {
                showBrutalistAlert('❌ Failed to delete user: ' + errorMessage, 'error');
            }
        } catch (error) {
            console.error('❌ Delete error:', error);
            showBrutalistAlert('❌ API error occurred. Check console.', 'error');
        }
    }
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

// ============================================
// CUSTOM BRUTALIST DIALOGS
// ============================================

/**
 * Shows a custom brutalist alert
 */
function showBrutalistAlert(message, type = 'info') {
    const overlay = document.createElement('div');
    overlay.className = 'brutalist-overlay';
    overlay.innerHTML = `
        <div class="brutalist-dialog alert-${type}">
            <div class="dialog-header">${type.toUpperCase()}</div>
            <div class="dialog-body">${message}</div>
            <div class="dialog-footer">
                <button class="brutalist-btn-sm" onclick="this.closest('.brutalist-overlay').remove()">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Auto remove after 5 seconds if not clicked
    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
    }, 5000);
}

/**
 * Shows a custom brutalist confirmation
 */
function showBrutalistConfirm(title, message, okText = 'OK', cancelText = 'CANCEL') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'brutalist-overlay';
        overlay.innerHTML = `
            <div class="brutalist-dialog">
                <div class="dialog-header">${title}</div>
                <div class="dialog-body">${message}</div>
                <div class="dialog-footer">
                    <button class="brutalist-btn-sm cancel-btn">${cancelText}</button>
                    <button class="brutalist-btn-sm ok-btn">${okText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const okBtn = overlay.querySelector('.ok-btn');
        const cancelBtn = overlay.querySelector('.cancel-btn');
        
        okBtn.onclick = () => {
            overlay.remove();
            resolve(true);
        };
        
        cancelBtn.onclick = () => {
            overlay.remove();
            resolve(false);
        };
    });
}

// Add CSS for brutalist dialogs dynamically if not present
if (!document.getElementById('brutalist-dialog-styles')) {
    const style = document.createElement('style');
    style.id = 'brutalist-dialog-styles';
    style.textContent = `
        .brutalist-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        }
        .brutalist-dialog {
            background: #0a0a0a;
            border: 3px solid #22d3ee;
            padding: 0;
            width: 90%;
            max-width: 450px;
            color: #fff;
            box-shadow: 10px 10px 0px #000;
            font-family: 'Space Grotesk', sans-serif;
        }
        .brutalist-dialog.alert-error { border-color: #ff0055; }
        .brutalist-dialog.alert-success { border-color: #CCFF00; }
        .dialog-header {
            background: #22d3ee;
            color: #000;
            padding: 8px 15px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .alert-error .dialog-header { background: #ff0055; }
        .alert-success .dialog-header { background: #CCFF00; }
        .dialog-body {
            padding: 25px;
            font-size: 16px;
            line-height: 1.5;
        }
        .dialog-footer {
            padding: 15px;
            display: flex;
            justify-content: flex-end;
            gap: 15px;
            border-top: 1px solid #333;
        }
        .brutalist-btn-sm {
            background: transparent;
            border: 2px solid #22d3ee;
            color: #22d3ee;
            padding: 5px 20px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.2s;
        }
        .brutalist-btn-sm:hover {
            background: #22d3ee;
            color: #000;
        }
        .ok-btn {
            background: #ff0055;
            border-color: #ff0055;
            color: #fff;
        }
        .ok-btn:hover {
            background: #cc0044;
            color: #fff;
        }
        .cancel-btn {
            border-color: #666;
            color: #666;
        }
        .cancel-btn:hover {
            background: #333;
            color: #fff;
        }
    `;
    document.head.appendChild(style);
}

// Global scope availability
window.deleteUser = deleteUser;
window.showBrutalistAlert = showBrutalistAlert;
window.showBrutalistConfirm = showBrutalistConfirm;
window.contactPendingMember = typeof contactPendingMember !== 'undefined' ? contactPendingMember : undefined;
window.openEditUserModal = typeof openEditUserModal !== 'undefined' ? openEditUserModal : undefined;
window.saveUserEdits = typeof saveUserEdits !== 'undefined' ? saveUserEdits : undefined;
window.closeEditModal = typeof closeEditModal !== 'undefined' ? closeEditModal : undefined;

