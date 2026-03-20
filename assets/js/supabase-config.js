// ============================================
// SUPABASE CONFIGURATION
// ============================================

// Supabase credentials
// Get from: https://app.supabase.com → Settings → API

const SUPABASE_URL = 'https://aaejtdniyakebgztsbxz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2AVJ9XPMm2fjgCbU4G4Rww_40qklJnQ'

// Initialize Supabase client with proper error handling
let supabase = null

// Initialize Supabase client (called immediately and on DOMContentLoaded)
function initSupabaseClient() {
    if (supabase) {
        return true // Already initialized
    }
    
    try {
        // Check if Supabase library is loaded
        if (!window.supabase || !window.supabase.createClient) {
            console.warn('⚠️ Supabase library not available, retrying in 100ms...')
            return false
        }
        
        // Check if URL and key are configured
        if (SUPABASE_URL.includes('your-project') || SUPABASE_URL.includes('placeholder')) {
            console.warn('⚠️ Supabase URL not configured. Using localStorage fallback.')
            supabase = null
            return false
        }
        
        // Initialize the client
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        console.log('✅ Supabase client initialized successfully')
        return true
    } catch (err) {
        console.error('❌ Error initializing Supabase:', err.message)
        supabase = null
        return false
    }
}

// Try to initialize immediately
initSupabaseClient()

// Also try on DOMContentLoaded if not initialized
if (!supabase) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!supabase) {
                initSupabaseClient()
            }
        })
    } else {
        // If DOMContentLoaded already fired, retry after a short delay
        setTimeout(() => {
            if (!supabase) {
                initSupabaseClient()
            }
        }, 50)
    }
}

// ============================================
// SUPABASE HELPER FUNCTIONS
// ============================================

// Check if Supabase is configured and initialized
function isSupabaseConfigured() {
    // Try to initialize if not done yet
    if (!supabase && window.supabase && window.supabase.createClient) {
        initSupabaseClient()
    }
    
    // Return true only if supabase client is available and URL is configured
    const isConfigured = supabase !== null && !SUPABASE_URL.includes('your-project') && !SUPABASE_URL.includes('placeholder')
    
    if (isConfigured) {
        console.log('✅ Supabase is configured and ready')
    } else {
        console.log('ℹ️ Supabase not configured, using localStorage')
    }
    
    return isConfigured
}
}

// Get all users
async function getUsers() {
    if (!isSupabaseConfigured()) {
        // Fallback to localStorage
        const data = localStorage.getItem('fitnesshub_registered_users')
        return data ? JSON.parse(data) : []
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')

    if (error) {
        console.error('Error fetching users:', error)
        return []
    }
    return data || []
}

// Get user by email
async function getUserByEmail(email) {
    if (!isSupabaseConfigured()) {
        // Fallback to localStorage
        const users = JSON.parse(localStorage.getItem('fitnesshub_registered_users') || '[]')
        return users.find(u => u.email === email)
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching user:', error)
    }
    return data || null
}

// Add new user
async function addUser(userData) {
    if (!isSupabaseConfigured()) {
        // Fallback to localStorage
        const users = JSON.parse(localStorage.getItem('fitnesshub_registered_users') || '[]')
        users.push(userData)
        localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users))
        return userData
    }

    const { data, error } = await supabase
        .from('users')
        .insert([{
            email: userData.email,
            full_name: userData.fullName,
            phone: userData.phone,
            age: userData.age,
            gender: userData.gender,
            height: userData.height,
            weight: userData.weight,
            fitness_goal: userData.goal,
            experience: userData.experience,
            plan_type: userData.plan?.type,
            registration_date: userData.registrationDate
        }])
        .select()

    if (error) {
        console.error('Error adding user:', error)
        return null
    }
    return data?.[0] || null
}

// Update user
async function updateUser(email, userData) {
    if (!isSupabaseConfigured()) {
        // Fallback to localStorage
        const users = JSON.parse(localStorage.getItem('fitnesshub_registered_users') || '[]')
        const index = users.findIndex(u => u.email === email)
        if (index !== -1) {
            users[index] = { ...users[index], ...userData }
            localStorage.setItem('fitnesshub_registered_users', JSON.stringify(users))
        }
        return users[index] || null
    }

    const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('email', email)
        .select()

    if (error) {
        console.error('Error updating user:', error)
        return null
    }
    return data?.[0] || null
}

// Delete user
async function deleteUserFromSupabase(email) {
    if (!isSupabaseConfigured()) {
        // Already deleted from localStorage
        return { success: true, message: 'User deleted from localStorage' }
    }

    const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('email', email)

    if (error) {
        console.error('Error deleting user from Supabase:', error)
        return null
    }
    return { success: true, message: 'User deleted from Supabase' }
}

// Get admin assignments
async function getAdminAssignments(userEmail) {
    if (!isSupabaseConfigured()) {
        // Fallback to localStorage
        const data = localStorage.getItem(`user_${userEmail}_assignments`)
        return data ? JSON.parse(data) : {}
    }

    const { data, error } = await supabase
        .from('admin_assignments')
        .select('*')
        .eq('user_email', userEmail)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching assignments:', error)
    }
    return data || {}
}

// Save admin assignments
async function saveAdminAssignments(userEmail, assignments) {
    if (!isSupabaseConfigured()) {
        // Fallback to localStorage
        localStorage.setItem(`user_${userEmail}_assignments`, JSON.stringify(assignments))
        return assignments
    }

    // Check if assignment exists
    const { data: existing } = await supabase
        .from('admin_assignments')
        .select('id')
        .eq('user_email', userEmail)
        .single()

    let result
    if (existing) {
        // Update
        result = await supabase
            .from('admin_assignments')
            .update(assignments)
            .eq('user_email', userEmail)
            .select()
    } else {
        // Insert
        result = await supabase
            .from('admin_assignments')
            .insert([{ user_email: userEmail, ...assignments }])
            .select()
    }

    if (result.error) {
        console.error('Error saving assignments:', result.error)
        return null
    }
    return result.data?.[0] || null
}

// Get diet plans
async function getDietPlans() {
    if (!isSupabaseConfigured()) {
        // Return local diet plans
        return null
    }

    const { data, error } = await supabase
        .from('diet_plans')
        .select('*')

    if (error) {
        console.error('Error fetching diet plans:', error)
        return null
    }
    return data
}

// Get workout plans
async function getWorkoutPlans() {
    if (!isSupabaseConfigured()) {
        // Return local workout plans
        return null
    }

    const { data, error } = await supabase
        .from('workout_plans')
        .select('*')

    if (error) {
        console.error('Error fetching workout plans:', error)
        return null
    }
    return data
}

// ============================================
// REAL-TIME SUBSCRIPTIONS (OPTIONAL)
// ============================================

function subscribeToUserChanges(callback) {
    if (!isSupabaseConfigured()) return null

    return supabase
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'users' },
            (payload) => callback(payload)
        )
        .subscribe()
}

// Example usage:
// subscribeToUserChanges((payload) => {
//     if (payload.eventType === 'INSERT') {
//         console.log('New user added:', payload.new)
//     } else if (payload.eventType === 'UPDATE') {
//         console.log('User updated:', payload.new)
//     }
// })
